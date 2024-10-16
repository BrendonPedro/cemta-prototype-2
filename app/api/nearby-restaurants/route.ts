// app/api/nearby-restaurants/route.ts

import { NextResponse } from "next/server";
import {
  Client,
  PlaceType1,
  PlacesNearbyRanking,
} from "@googlemaps/google-maps-services-js";
import {
  getCachedRestaurantsForLocation,
  saveCachedRestaurantsForLocation,
  getCachedImageUrl,
  saveImageUrlCache,
} from "@/app/services/firebaseFirestore";
import {
  uploadImageToBucket,
  getImageFromBucket,
} from "@/app/services/gcpBucketStorage";
import axios from "axios";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const limit = searchParams.get("limit") || "20";

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Latitude and longitude are required" },
      { status: 400 },
    );
  }

  try {
    console.log(`Received request for lat: ${lat}, lng: ${lng}`);

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    // Check if cached data exists
    const cachedRestaurants = await getCachedRestaurantsForLocation(
      parsedLat,
      parsedLng,
    );

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
      throw new Error(
        `Google Maps API returned status: ${response.data.status}`,
      );
    }

    const nearbyRestaurants = await Promise.all(
      response.data.results.slice(0, parseInt(limit)).map(async (place) => {
        let photoUrl = null;
        if (place.place_id && place.photos && place.photos.length > 0) {
          const photoReference = place.photos[0].photo_reference;

          // Check if we have a cached image URL
          let cachedImageUrl = await getCachedImageUrl(
            place.place_id,
            place.name ?? "unknown",
          );

          if (cachedImageUrl) {
            photoUrl = cachedImageUrl;
          } else if (photoReference) {
            // If not cached, fetch from Google and cache it
            const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`;

            try {
              const imageResponse = await axios.get(googlePhotoUrl, {
                responseType: "arraybuffer",
              });
              const contentType = imageResponse.headers["content-type"];
              const imageBuffer = Buffer.from(imageResponse.data, "binary");

              // Upload to GCP bucket
              if (place.place_id) {
                photoUrl = await uploadImageToBucket(
                  place.place_id,
                  imageBuffer,
                  contentType,
                );

                // Save URL to Firestore cache
                await saveImageUrlCache(
                  place.place_id,
                  place.name ?? "unknown",
                  photoUrl,
                );
              }
            } catch (error) {
              console.error(
                `Failed to fetch or cache photo for ${place.name}:`,
                error,
              );
              photoUrl = null;
            }
          }
        }

        return {
          id: place.place_id,
          name: place.name,
          address: place.vicinity,
          latitude: place.geometry?.location.lat,
          longitude: place.geometry?.location.lng,
          rating: place.rating || 0,
          photoUrl: photoUrl,
        };
      }),
    );

    // Save to cache
    await saveCachedRestaurantsForLocation(
      parsedLat,
      parsedLng,
      nearbyRestaurants,
    );

    console.log("Saved new data to cache.");

    return NextResponse.json({ restaurants: nearbyRestaurants });
  } catch (error) {
    console.error("Error fetching nearby restaurants:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch nearby restaurants",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
