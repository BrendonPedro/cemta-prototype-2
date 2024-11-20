// app/api/restaurants/route.ts

import { NextResponse } from "next/server";
import { Client } from "@googlemaps/google-maps-services-js";
import { batchUpdateRestaurants, getCachedRestaurantsForLocation, saveCachedRestaurantsForLocation } from "@/app/services/firebaseFirestore";
import { Timestamp } from "firebase/firestore";
import type { CachedRestaurant } from "@/app/services/firebaseFirestore";
import { determineLocationDetails } from "@/app/services/locationService";
import geohash from "ngeohash";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const type = searchParams.get("type") || "full";

  const authHeader = request.headers.get("authorization");
  const firebaseToken = authHeader?.split("Bearer ")[1] || null;

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Latitude and longitude are required" },
      { status: 400 }
    );
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("Google Maps API key is not set");
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const now = Date.now();
    const gridKey = geohash.encode(parsedLat, parsedLng, 6);

    // Check cache first
    console.log("Checking cache for location:", { lat: parsedLat, lng: parsedLng });
    const cachedRestaurants = await getCachedRestaurantsForLocation(parsedLat, parsedLng);
    
    if (cachedRestaurants?.length) {
      console.log(`Found ${cachedRestaurants.length} restaurants in cache`);
      const response = {
        restaurants: cachedRestaurants.slice(0, limit),
        county: cachedRestaurants[0]?.county || 'Unknown County',
        cached: true,
        lastUpdated: {
          county: now,
          restaurants: now,
          images: now,
        },
        metadata: {
          total: cachedRestaurants.length,
          returned: Math.min(cachedRestaurants.length, limit),
          gridKey
        }
      };

      return NextResponse.json(response);
    }

    // If no cache, fetch from Places API
    console.log("Cache miss, fetching from Places API");
    const client = new Client({});
    
    const placesResponse = await client.placesNearby({
      params: {
        location: { lat: parsedLat, lng: parsedLng },
        radius: 1000,
        type: 'restaurant',
        key: apiKey
      }
    });

    const { county, townName } = await determineLocationDetails(parsedLat, parsedLng);

    // Process results
    const restaurants: CachedRestaurant[] = placesResponse.data.results
  .filter(place => place.place_id && place.name && place.geometry?.location)  // Filter out invalid places
  .map(place => ({
    id: place.place_id!,  
    name: place.name!,    
    address: place.vicinity || 'Unknown address',
    latitude: place.geometry!.location.lat,  
    longitude: place.geometry!.location.lng, 
    rating: place.rating || 0,
    menuCount: 0,
    hasMenu: false,
    county,
    townName,
    source: 'google' as const,
    hasGoogleData: true,
    hasYelpData: false,  
    imageUrl: place.photos?.[0]?.photo_reference 
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`
      : '/placeholder-restaurant.jpg'
  }));

if (restaurants.length === 0) {
  console.warn('No valid restaurants found in Places API response');
}

    // Save to cache
    if (restaurants.length > 0) {
      console.log(`Saving ${restaurants.length} restaurants to cache`);
      await saveCachedRestaurantsForLocation(parsedLat, parsedLng, restaurants);
      await batchUpdateRestaurants(restaurants);
    }

    const response = {
      restaurants: restaurants.slice(0, limit),
      county,
      cached: false,
      lastUpdated: {
        county: now,
        restaurants: now,
        images: now
      },
      metadata: {
        total: restaurants.length,
        returned: Math.min(restaurants.length, limit),
        gridKey
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error processing restaurant data:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      {
        error: "Failed to process restaurant data",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}