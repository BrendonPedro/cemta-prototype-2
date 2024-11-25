/**
 * Restaurant API Route Handler
 * Handles GET requests for restaurant data with caching and Google Places API integration
 */

import { NextResponse } from "next/server";
import { 
  batchUpdateRestaurants, 
  getCachedRestaurantsForLocation, 
  getLocationCacheKey, 
  saveCachedRestaurantsForLocation,
  saveRestaurantData,
} from "@/app/services/firebaseFirestore";
import { determineLocationDetails } from "@/app/services/locationService";
import { uploadRestaurantImage } from "@/app/services/gcpBucketStorage";
import { getYelpBusinessWithPhotos } from "@/app/services/yelpService";
import { EXCLUDED_ESTABLISHMENTS } from '@/app/constants/excludedEstablishments';
import admin from "@/config/firebaseAdmin";
import axios from "axios";
import { 
  Client, 
  PlaceData,
  PlaceType1,
  PlaceType2,
  Language,
  PlacesNearbyRanking 
} from "@googlemaps/google-maps-services-js";
import type { CachedRestaurant } from "@/app/services/firebaseFirestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import geohash from 'ngeohash';
import { CONFIG } from "@/lib/database-builder/config";

// ----------------
// Constants
// ----------------

const RATE_LIMIT = {
  REQUESTS_PER_MINUTE: 60,
  WINDOW_MS: 60 * 1000  // 1 minute in milliseconds
};

const { SEARCH, CACHE } = CONFIG;

// ----------------
// Types & Interfaces
// ----------------

interface RequestParams {
  lat: number;
  lng: number;
  limit: number;
  type: string;
}

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

interface ApiCallMetrics {
  places: number;
  newRestaurants: number;
  cachedRestaurants: number;
}

// ----------------
// Validation Helpers
// ----------------

function isValidEstablishment(place: PlaceData): boolean {
  const validTypes = [
    'restaurant', 'food', 'meal_takeaway', 'cafe',
    'meal_delivery', 'bakery', 'bar', 'establishment',
    'point_of_interest'
  ];

  return place.types?.some(type => 
    validTypes.includes(type.toLowerCase())
  ) ?? false;
}

function isCompletePlaceData(place: Partial<PlaceData>): place is PlaceData {
  return !!(
    place.place_id &&
    place.name &&
    place.geometry?.location &&
    typeof place.geometry.location.lat === 'number' &&
    typeof place.geometry.location.lng === 'number'
  );
}

// ----------------
// Authentication & Authorization
// ----------------

async function validateFirebaseToken(authHeader: string | null): Promise<DecodedIdToken> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const tokenExp = decodedToken.exp * 1000;
    
    if (Date.now() >= tokenExp) {
      throw new Error('Token has expired');
    }

    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Invalid or expired token');
  }
}

// ----------------
// Request Processing
// ----------------

function validateRequestParams(searchParams: URLSearchParams): RequestParams {
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const type = searchParams.get("type") || "full";

  const parsedLat = Number(lat);
  if (!lat || isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
    throw new Error("Invalid latitude value");
  }

  const parsedLng = Number(lng);
  if (!lng || isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
    throw new Error("Invalid longitude value");
  }

  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw new Error("Limit must be between 1 and 100");
  }

  return { lat: parsedLat, lng: parsedLng, limit, type };
}

// ----------------
// Rate Limiting
// ----------------

async function checkRateLimit(userId: string): Promise<void> {
  const rateRef = admin.firestore().collection('rateLimits').doc(userId);
  const now = Date.now();
  
  await admin.firestore().runTransaction(async (transaction) => {
    const doc = await transaction.get(rateRef);
    const data = doc.data() as RateLimitInfo | undefined;
    
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
}

// helper to calculate distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// ----------------
// Place Processing
// ----------------

async function processPlaceDetails(
  place: PlaceData,
  apiKey: string,
  client: Client = new Client({})
): Promise<CachedRestaurant> {
  const { county, townName } = await determineLocationDetails(
    place.geometry!.location.lat,
    place.geometry!.location.lng
  );

  let imageUrl = '/placeholder-restaurant.jpg';
  let hasGoogleImage = false;
  let yelpData = null;

  // Try to get Google image first
  if (place.photos?.[0] && 'photo_reference' in place.photos[0]) {
    try {
      const photoRef = (place.photos[0] as any).photo_reference;
      const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${apiKey}`;
      const savedImageUrl = await uploadRestaurantImage(
        place.place_id ?? '',
        Buffer.from((await axios.get(googlePhotoUrl, { responseType: 'arraybuffer' })).data),
        'image/jpeg',
        'google'
      );
      imageUrl = savedImageUrl;
      hasGoogleImage = true;
    } catch (error) {
      console.error(`Failed to fetch Google image for ${place.name}:`, error);
    }
  }

  // Try to get Yelp data if no Google image
  if (!hasGoogleImage) {
    try {
      yelpData = await getYelpBusinessWithPhotos(
        place.name!,
        place.geometry!.location.lat,
        place.geometry!.location.lng
      );

      if (yelpData?.photos?.[0]) {
        const savedImageUrl = await uploadRestaurantImage(
          place.place_id!,
          Buffer.from((await axios.get(yelpData.photos[0], { responseType: 'arraybuffer' })).data),
          'image/jpeg',
          'yelp'
        );
        imageUrl = savedImageUrl;
      }
    } catch (error) {
      console.error(`Failed to fetch Yelp data for ${place.name}:`, error);
    }
  }

  // Get place details for additional information
  try {
    const detailsResponse = await client.placeDetails({
      params: {
        place_id: place.place_id ?? '',
        key: apiKey,
        // Add operating hours to the fields
        fields: [
          'website',
          'formatted_phone_number',
          'price_level',
          'opening_hours',
          'formatted_address',
          'name',
          'rating',
          'photos'
        ]
      }
    });
    const details = detailsResponse.data.result;

    // Save restaurant data with all available information
    await saveRestaurantData(
      {
        id: place.place_id!,
        name: place.name!,
        address: place.vicinity || 'No Address Available',
        location: {
          lat: place.geometry!.location.lat,
          lng: place.geometry!.location.lng,
        },
        rating: place.rating || 0,
        priceLevel: details.price_level?.toString() || null,
        phone: details.formatted_phone_number || null,
        website: details.website || null,
        googlePlaceId: place.place_id!,
        yelpId: yelpData?.id || null,
        yelpRating: yelpData?.rating || null,
        photos: imageUrl !== '/placeholder-restaurant.jpg' ? [imageUrl] : [],
        menuCount: 0,
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        source: {
          google: hasGoogleImage,
          yelp: !hasGoogleImage && imageUrl !== '/placeholder-restaurant.jpg'
        },
        townName
      },
      county,
      townName,
      { 
        fromCache: false,
        incrementalUpdate: true,
        forceEnsureStructure: true,
        imageUrl
      }
    );

    return {
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
      source: 'google',
      hasGoogleData: true,
      hasYelpData: !!yelpData,
      imageUrl,
      priceLevel: details.price_level?.toString() || null,
      phone: details.formatted_phone_number || null,
      website: details.website || null,
      yelpId: yelpData?.id || null,
      yelpRating: yelpData?.rating || null,
      openingHours: details.opening_hours ? {
        openNow: details.opening_hours.open_now,
        periods: details.opening_hours.periods,
        weekdayText: details.opening_hours.weekday_text
      } : null
    } as CachedRestaurant;
  } catch (error) {
    console.error(`Failed to fetch place details for ${place.name}:`, error);
    // Return basic restaurant data if details fetch fails
    return {
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
      source: 'google',
      hasGoogleData: true,
      hasYelpData: !!yelpData,
      imageUrl
    } as CachedRestaurant;
  }
}

// ----------------
// Main Route Handler
// ----------------

export async function GET(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key is not configured');
    }

    // Authentication
    const decodedToken = await validateFirebaseToken(
      request.headers.get("authorization")
    );
    
    if (!decodedToken.uid) {
      return NextResponse.json(
        { error: "Unauthorized - invalid user ID" },
        { status: 401 }
      );
    }

    // Rate Limiting
    await checkRateLimit(decodedToken.uid);

    // Parameter Validation
    const { searchParams } = new URL(request.url);
    const params = validateRequestParams(searchParams);
    
    // User Verification
    const userRef = admin.firestore().collection('users').doc(decodedToken.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User document not found" },
        { status: 404 }
      );
    }

    // Initialize Google Maps client
    const googleMapsClient = new Client({});
    
    // Check cache first
    console.log("Checking cache for location:", { lat: params.lat, lng: params.lng });
    const cachedRestaurants = await getCachedRestaurantsForLocation(params.lat, params.lng);
    let shouldFetchNew = true;
    let combinedRestaurants: CachedRestaurant[] = [];
    
    if (cachedRestaurants?.length) {
      // Check if we have enough nearby cached restaurants
      const nearbyRestaurants = cachedRestaurants.filter(restaurant => {
        const distance = calculateDistance(
          params.lat, 
          params.lng, 
          restaurant.latitude, 
          restaurant.longitude
        );
        return distance <= SEARCH.INITIAL_RADIUS;
      });
    
      if (nearbyRestaurants.length >= SEARCH.MIN_RESULTS) {
        shouldFetchNew = false;
        combinedRestaurants = nearbyRestaurants;
      } else {
        combinedRestaurants = cachedRestaurants;
      }
    }

    // Initialize metrics
    let apiCallMetrics: ApiCallMetrics = {
      places: 0,
      newRestaurants: 0,
      cachedRestaurants: cachedRestaurants?.length || 0
    };

    // Search logic
    let allResults: PlaceData[] = [];
    let radius = SEARCH.INITIAL_RADIUS;
    
    if (shouldFetchNew) {
      console.log("Fetching new restaurants from Places API");
      
      while (
        allResults.length < SEARCH.MIN_RESULTS && 
        radius <= SEARCH.MAX_RADIUS
      ) {
        console.log(`Searching with radius: ${radius}m, Current results: ${allResults.length}`);
        
        const placesResponse = await googleMapsClient.placesNearby({
          params: {
            location: { lat: params.lat, lng: params.lng },
            radius: radius,
            language: Language.zh_TW,
            key: apiKey,
            // Use Type assertion to handle mixed PlaceType1 and PlaceType2
            type: [
              PlaceType1.restaurant,
              PlaceType1.bar,
              PlaceType1.cafe,
              PlaceType1.bakery,
              PlaceType1.meal_takeaway,
              PlaceType1.meal_delivery,
              'food' // as string since it's in PlaceType2
            ].join('|') as string,  // Type assertion to satisfy the API typing
            keyword: [
              'restaurant', 'cafe', 'food', 
              'meal_delivery', 'meal_takeaway',
              'bar', 'night_club', 'bakery',
              'KFC', '肯德基', 'Nu Pasta', 
              'restaurant|餐廳|food|drink|cafe|飲料|茶|咖啡',
              'fast food', 'chain restaurant'
            ].join('|')
          },
          timeout: 10000 
        });
        
        apiCallMetrics.places++;

        // Filter and validate results
        const validResults = placesResponse.data.results.filter(isCompletePlaceData);
        const newResults = validResults.filter(place => {
          const isDuplicate = combinedRestaurants.some(r => r.id === place.place_id);
          const normalizedName = place.name.toLowerCase();
          const isExcluded = EXCLUDED_ESTABLISHMENTS.some(excluded => 
            normalizedName.includes(excluded.toLowerCase())
          );
          
          return !isDuplicate && !isExcluded && isValidEstablishment(place);
        });

        allResults = [...allResults, ...newResults];
        
        if (allResults.length >= SEARCH.MAX_RESULTS) {
          break;
        }
        
        radius += SEARCH.RADIUS_INCREMENT;
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Process and add new restaurants
      if (allResults.length > 0) {
        const processedNewRestaurants = await Promise.all(
          allResults.map(place => processPlaceDetails(place, apiKey))
        );
        apiCallMetrics.newRestaurants = processedNewRestaurants.length;
        combinedRestaurants = [...combinedRestaurants, ...processedNewRestaurants];
        
        // Save to cache
        await saveCachedRestaurantsForLocation(params.lat, params.lng, combinedRestaurants);
        await batchUpdateRestaurants(combinedRestaurants);
      }
    }

    // Get location details
    const { county, townName } = await determineLocationDetails(params.lat, params.lng);
    const now = Date.now();

  
    const gridKey = getLocationCacheKey(params.lat, params.lng);
   
    return NextResponse.json({
      restaurants: combinedRestaurants.slice(0, params.limit),
      county,
      cached: !shouldFetchNew,
      lastUpdated: { county: now, restaurants: now, images: now },
      metadata: {
        total: combinedRestaurants.length,
        returned: Math.min(combinedRestaurants.length, params.limit),
        gridKey,  // Use the gridKey from getLocationCacheKey
        metrics: {
          apiCalls: apiCallMetrics.places,
          newRestaurants: apiCallMetrics.newRestaurants,
          cachedRestaurants: apiCallMetrics.cachedRestaurants,
          searchRadius: radius
        }
      }
    });
  } catch (error) {
    console.error("Error processing request:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Enhanced error handling with more specific status codes
    if (error instanceof Error) {
      if (error.message.includes('authorization') || error.message.includes('token')) {
        return NextResponse.json(
          { error: "Unauthorized request", details: error.message },
          { status: 401 }
        );
      }
      if (error.message.includes('Rate limit')) {
        return NextResponse.json(
          { error: "Rate limit exceeded", details: error.message },
          { status: 429 }
        );
      }
      if (error.message.includes('latitude') || error.message.includes('longitude')) {
        return NextResponse.json(
          { error: "Invalid parameters", details: error.message },
          { status: 400 }
        );
      }
    }

    // Default error response
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}