// app/api/nearby-restaurants/route.ts

import { NextResponse } from "next/server";
import axios from 'axios';
import {
  Client,
  PlaceType1,
  PlacesNearbyRanking,
} from "@googlemaps/google-maps-services-js";
import {
  getCachedRestaurantsForLocation,
  saveCachedRestaurantsForLocation,
  checkExistingMenuForRestaurant,
  CachedRestaurant,
} from "@/app/services/firebaseFirestore";
import { searchYelpBusiness } from "@/app/services/yelpService";
import { LocationService } from "@/app/services/LocationService";
import { uploadImageToBucket } from "@/app/services/gcpBucketStorage";

async function saveRestaurantImage(
  imageUrl: string,
  restaurantId: string,
  source: 'google' | 'yelp'
): Promise<string> {
  try {
    // Download image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer'
    });

    // Generate filename
    const timestamp = Date.now();
    const fileName = `${restaurantId}/${timestamp}_${source}.jpg`;

    // Upload to GCS bucket
    const savedImageUrl = await uploadImageToBucket(
      fileName,
      Buffer.from(response.data),
      'image/jpeg'
    );

    return savedImageUrl;
  } catch (error) {
    console.error(`Error saving ${source} image for restaurant ${restaurantId}:`, error);
    return imageUrl; // Fallback to original URL if save fails
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Latitude and longitude are required" },
      { status: 400 }
    );
  }

  try {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    // Check cache first
    const cachedRestaurants = await getCachedRestaurantsForLocation(parsedLat, parsedLng);
    if (cachedRestaurants) {
      console.log("Serving cached data.");
      return NextResponse.json({ restaurants: cachedRestaurants });
    }

    console.log("No cached data found. Fetching from Google Maps API.");

    const googleMapsClient = new Client({});
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      throw new Error("Google Maps API key is not set");
    }

    const response = await googleMapsClient.placesNearby({
      params: {
        location: { lat: parsedLat, lng: parsedLng },
        rankby: PlacesNearbyRanking.distance,
        type: PlaceType1.restaurant,
        key: apiKey,
      },
    });

    if (response.data.status !== "OK") {
      throw new Error(`Google Maps API returned status: ${response.data.status}`);
    }

    const locationService = LocationService.getInstance();

    // Process results with optimized location service
    const restaurantsPromises = response.data.results
    .slice(0, limit)
    .map(async (place) => {
      if (!place.place_id || !place.name || !place.geometry?.location) {
        return null;
      }

      const hasMenu = await checkExistingMenuForRestaurant(place.place_id);
      const county = await locationService.getCountyName(
        place.geometry.location.lat,
        place.geometry.location.lng,
        apiKey
      );

      const defaultImageUrl = "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1074&q=80";

  // Handle Google photo
      let imageUrl = defaultImageUrl;
      if (place.photos?.[0]) {
        const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`;
        imageUrl = await saveRestaurantImage(googlePhotoUrl, place.place_id, 'google');
      }

      let restaurant: CachedRestaurant = {
        id: place.place_id,
        name: place.name,
        address: place.vicinity || '',
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        rating: place.rating || 0,
        hasMenu,
        menuCount: hasMenu ? 1 : 0,
        county: county || 'Unknown County',
        source: 'google',
        hasGoogleData: true,
        imageUrl
      };

      // Handle Yelp data
      if (!place.photos?.length) {
        try {
          const yelpData = await searchYelpBusiness(
            place.name,
            place.geometry.location.lat,
            place.geometry.location.lng
          );

          if (yelpData) {
            const yelpImageUrl = yelpData.photos?.[0] ? 
              await saveRestaurantImage(yelpData.photos[0], place.place_id, 'yelp') :
              restaurant.imageUrl;

            restaurant = {
              ...restaurant,
              yelpId: yelpData.id,
              hasYelpData: true,
              imageUrl: yelpImageUrl,
              rating: Math.max(restaurant.rating, yelpData.rating || 0)
            };
          }
        } catch (error) {
          console.warn(`Failed to fetch Yelp data for ${place.name}:`, error);
        }
      }

      return restaurant;
    });

    const restaurants = (await Promise.all(restaurantsPromises))
      .filter((r): r is CachedRestaurant => r !== null);

    // Cache the results
    if (restaurants.length > 0) {
      await saveCachedRestaurantsForLocation(parsedLat, parsedLng, restaurants);
      console.log("Saved new data to cache.");
    }

    return NextResponse.json({ restaurants });
  } catch (error) {
    console.error("Error fetching nearby restaurants:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch nearby restaurants",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
