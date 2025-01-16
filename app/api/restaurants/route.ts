import { NextResponse } from "next/server";
import { getNearbyRestaurants } from "@/app/services/restaurant/restaurantService";
import { validateTaiwanCoordinates } from "@/config/googleMapsConfig";
import admin from "@/config/firebaseAdmin";
import type { DecodedIdToken } from "firebase-admin/auth";
import { CONFIG } from "@/lib/database-builder/config";
import { calculateDistance } from "@/app/utils/locationUtils";

const RATE_LIMIT = {
  REQUESTS_PER_MINUTE: 60,
  WINDOW_MS: 60 * 1000
};

export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    // 1. Authentication
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

    // 2. Parameter Validation
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

    // 3. Rate Limiting
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

    // 4. Get restaurants using the new service
    const { restaurants, metrics } = await getNearbyRestaurants(
      lat, 
      lng,
      authHeader.split('Bearer ')[1] // Use the actual token we extracted earlier
    );

    // 5. Sort and limit results
    const sortedResults = restaurants
      .sort((a, b) => {
        const distA = calculateDistance(lat, lng, a.latitude, a.longitude);
        const distB = calculateDistance(lat, lng, b.latitude, b.longitude);
        return distA - distB;
      })
      .slice(0, limit);

    return NextResponse.json({
      restaurants: sortedResults,
      metadata: {
        total: restaurants.length,
        returned: sortedResults.length,
        metrics: {
          ...metrics,
          searchRadius: CONFIG.SEARCH.PRECISE.RADIUS,
          processingTime: Date.now() - startTime,
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