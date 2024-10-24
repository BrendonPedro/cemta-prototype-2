// app/api/nearby-restaurants/route.ts

import { NextResponse } from "next/server";
import { getLocationData } from "@/app/services/locationService";
import { batchUpdateRestaurants } from "@/app/services/firebaseFirestore";
import { Timestamp } from "firebase/firestore";
import type { CachedRestaurant } from "@/app/services/firebaseFirestore";

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
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("Google Maps API key is not set");
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    const data = await getLocationData(parsedLat, parsedLng, apiKey);

    console.log(`Data cached: ${data.cached}, Grid Key: ${data.gridKey}`);
    if (!data.cached) {
      console.log(`Total API calls made: ${data.apiCallCount}`);
      
      // Update restaurants in batches if not cached
      await batchUpdateRestaurants(data.restaurants);
    }

    // Format timestamps for response
    const formattedLastUpdated = {
      county: convertTimestampToISOString(data.lastUpdated.county),
      restaurants: convertTimestampToISOString(data.lastUpdated.restaurants),
      images: convertTimestampToISOString(data.lastUpdated.images),
    };

    return NextResponse.json({
      restaurants: data.restaurants.slice(0, limit),
      county: data.county,
      cached: data.cached,
      lastUpdated: formattedLastUpdated,
      metadata: {
        total: data.restaurants.length,
        returned: Math.min(data.restaurants.length, limit),
        gridKey: data.gridKey,
      },
    });
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

function convertTimestampToISOString(timestamp: any): string | null {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  } else if (typeof timestamp === 'object' && timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
    const ts = new Timestamp(timestamp.seconds, timestamp.nanoseconds);
    return ts.toDate().toISOString();
  } else if (typeof timestamp === 'number') {
    return new Date(timestamp).toISOString();
  } else {
    console.error('Invalid timestamp format:', timestamp);
    return null;
  }
}