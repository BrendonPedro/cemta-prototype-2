// app/api/restaurants/route.ts

import { NextResponse } from "next/server";
import { 
  batchUpdateRestaurants, 
  getCachedRestaurantsForLocation, 
  getLocationCacheKey, 
  saveCachedRestaurantsForLocation,
} from "@/app/services/firebaseFirestore";
import { determineLocationDetails } from "@/app/services/locationService";
import { fetchPreciseLocationResults } from "@/app/services/placeServices";
import { validateTaiwanCoordinates } from "@/config/googleMapsConfig";
import admin from "@/config/firebaseAdmin";
import { Client } from "@googlemaps/google-maps-services-js";
import type { DecodedIdToken } from "firebase-admin/auth";
import { CONFIG } from "@/lib/database-builder/config";
import { calculateDistance } from "@/app/utils/locationUtils";
import type { SearchMetrics } from '@/lib/database-builder/types';
import { CachedRestaurant } from "@/interfaces/restaurant/types";

const RATE_LIMIT = {
  REQUESTS_PER_MINUTE: 60,
  WINDOW_MS: 60 * 1000
};

export async function GET(request: Request) {
  const startTime = Date.now();
  const metrics: SearchMetrics = {
    cachedCount: 0,
    newPlaces: 0,
    apiCalls: 0,
    processingTime: 0,
    totalResults: 0
  };

  try {
    // 1. Validate API key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 2. Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    let decodedToken: DecodedIdToken;
    try {
      const token = authHeader.split('Bearer ')[1];
      decodedToken = await admin.auth().verifyIdToken(token);
      
      if (!decodedToken.uid) {
        throw new Error("Invalid user ID in token");
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // 3. Parameter Validation
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);

    if (!validateTaiwanCoordinates(lat, lng)) {
      return NextResponse.json(
        { error: "Coordinates outside Taiwan bounds" },
        { status: 400 }
      );
    }

    // 4. Rate Limiting
    const rateRef = admin.firestore().collection('rateLimits').doc(decodedToken.uid);
    const now = Date.now();
    
    await admin.firestore().runTransaction(async (transaction) => {
      const doc = await transaction.get(rateRef);
      const data = doc.data();
      
      if (!data || now >= data.resetTime) {
        transaction.set(rateRef, {
          count: 1,
          resetTime: now + RATE_LIMIT.WINDOW_MS
        });
      } else if (data.count >= RATE_LIMIT.REQUESTS_PER_MINUTE) {
        throw new Error('Rate limit exceeded');
      } else {
        transaction.update(rateRef, { count: data.count + 1 });
      }
    });

    // 5. Check cache
    const cachedRestaurants = await getCachedRestaurantsForLocation(lat, lng);
    const existingIds = new Set<string>();
    let combinedResults: CachedRestaurant[] = []; 
    
    if (cachedRestaurants?.length) {
      cachedRestaurants.forEach(r => existingIds.add(r.id));
      
      const nearbyCached = cachedRestaurants.filter(restaurant => {
        const distance = calculateDistance(
          lat, lng, 
          restaurant.latitude, 
          restaurant.longitude
        );
        return distance <= CONFIG.SEARCH.PRECISE.RADIUS;
      });

      combinedResults = [...nearbyCached];
      metrics.cachedCount = nearbyCached.length;
    }

    // 6. Fetch new results if needed
    const client = new Client({});
    const { results: newPlaces, apiCalls } = await fetchPreciseLocationResults(
      lat,
      lng,
      client,
      apiKey,
      existingIds
    );

    metrics.apiCalls = apiCalls;
    metrics.newPlaces = newPlaces.length;

    if (newPlaces.length > 0) {
      // Process new places and add to cache
      const processedResults: CachedRestaurant[] = await Promise.all(
        newPlaces.map(async (place) => {
          const { county, townName } = await determineLocationDetails(
            place.geometry!.location.lat,
            place.geometry!.location.lng
          );

          return {
            id: place.place_id!,
            name: place.name!,
            address: place.vicinity!,
            rating: place.rating || 0,
            latitude: place.geometry!.location.lat,
            longitude: place.geometry!.location.lng,
            county,
            townName,
            menuCount: 0,
            hasDetailsFetched: false,
            hasMenu: false,
            hasGoogleData: true,
            hasYelpData: false,
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          };
        })
      );

      // Update cache with combined results
      await saveCachedRestaurantsForLocation(
        lat, 
        lng, 
        [...combinedResults, ...processedResults]
      );

      // Update Firestore
      await batchUpdateRestaurants(processedResults);

      // Add to combined results
      combinedResults = [...combinedResults, ...processedResults];
    }

    // 7. Sort by distance and apply limit
    const sortedResults: CachedRestaurant[] = combinedResults
    .sort((a, b) => {
      const distA = calculateDistance(lat, lng, a.latitude, a.longitude);
      const distB = calculateDistance(lat, lng, b.latitude, b.longitude);
      return distA - distB;
    })
    .slice(0, limit);

  // 8. Get location details
  const { county, townName } = await determineLocationDetails(lat, lng);
  const gridKey = getLocationCacheKey(lat, lng);

  return NextResponse.json({
    restaurants: sortedResults,
    county,
    metadata: {
      total: combinedResults.length,
      returned: sortedResults.length,
      gridKey,
      metrics: {
        apiCalls: metrics.apiCalls,
        newRestaurants: metrics.newPlaces,
        cachedRestaurants: metrics.cachedCount,
        searchRadius: CONFIG.SEARCH.PRECISE.RADIUS,
        cacheStatus: metrics.cachedCount > 0 ? 'hit' : 'miss',
        processingTime: Date.now() - startTime,
        totalResults: combinedResults.length
      }
    }
  });


  } catch (error) {
    console.error("Error processing request:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429 }
        );
      }
      if (error.message.includes('auth')) {
        return NextResponse.json(
          { error: "Authentication failed" },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}