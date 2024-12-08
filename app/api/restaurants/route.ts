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
  saveRestaurant,
  transformPlaceToRestaurant,
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
  PlacesNearbyRanking,
  AddressComponent,
  PlacesNearbyRequest
} from "@googlemaps/google-maps-services-js";
import type { CachedRestaurant, Restaurant, OpeningHours } from "@/interfaces/restaurant/types";
import type { DecodedIdToken } from "firebase-admin/auth";
import geohash from 'ngeohash';
import { CONFIG } from "@/lib/database-builder/config";
import { calculateDistance } from "@/app/utils/locationUtils";
import type { SearchMetrics } from '@/lib/database-builder/types';

// ----------------
// Constants
// ----------------

const RATE_LIMIT = {
  REQUESTS_PER_MINUTE: 60,
  WINDOW_MS: 60 * 1000  // 1 minute in milliseconds
};

const { SEARCH: { PRECISE }, CACHE } = CONFIG;

// ----------------
// Types & Interfaces
// ----------------

interface ImageData {
  imageUrl: string;
  hasGoogleImage: boolean;
  yelpData: any | null;
}

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


// Function to get restaurant images
async function getRestaurantImages(
  place: PlaceData,
  apiKey: string
): Promise<ImageData> {
  let imageUrl = '/placeholder-restaurant.jpg';
  let hasGoogleImage = false;
  let yelpData = null;

  // Try Google image first
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

  // Try Yelp if no Google image
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

  return { imageUrl, hasGoogleImage, yelpData };
}

// Function to get enhanced place details
async function getEnhancedPlaceDetails(
  place: PlaceData,
  apiKey: string,
  client: Client
) {
  const detailsResponse = await client.placeDetails({
    params: {
      place_id: place.place_id ?? '',
      key: apiKey,
      fields: [
        'website',
        'formatted_phone_number',
        'price_level',
        'opening_hours',
        'formatted_address',
        'name',
        'rating',
        'photos',
        'utc_offset'
      ]
    }
  });
  return detailsResponse.data.result;
}

// ----------------
// Validation Helpers
// ----------------

function isValidEstablishment(place: Partial<PlaceData>): boolean {
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
  const requiredFields = [
    'place_id',
    'name',
    'geometry',
    'vicinity'
  ];

  // Check required fields exist
  const hasRequiredFields = requiredFields.every(field => 
    place[field as keyof PlaceData] !== undefined
  );

  if (!hasRequiredFields || !place.geometry?.location) {
    return false;
  }

  // Ensure location has valid coordinates
  const location = place.geometry.location;
  if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return false;
  }

  // Initialize missing arrays with default values if undefined
  const completedPlace = place as PlaceData;
  
  if (!Array.isArray(completedPlace.address_components)) {
    completedPlace.address_components = [];
  }

  if (!Array.isArray(completedPlace.types)) {
    completedPlace.types = [];
  }

  if (!Array.isArray(completedPlace.photos)) {
    completedPlace.photos = [];
  }

  // Ensure all required properties are present with correct types
  return (
    typeof completedPlace.place_id === 'string' &&
    typeof completedPlace.name === 'string' &&
    typeof completedPlace.vicinity === 'string' &&
    Array.isArray(completedPlace.address_components) &&
    Array.isArray(completedPlace.types) &&
    completedPlace.geometry !== undefined &&
    typeof completedPlace.geometry.location.lat === 'number' &&
    typeof completedPlace.geometry.location.lng === 'number'
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

// ----------------
// Place Processing
// ----------------

async function processPlaceDetails(
  place: PlaceData,
  apiKey: string,
  client: Client = new Client({})
): Promise<Restaurant> {
  const { county, townName } = await determineLocationDetails(
    place.geometry!.location.lat,
    place.geometry!.location.lng
  );

  // Get base restaurant data using single source of truth
  const baseRestaurant = transformPlaceToRestaurant(place, county, townName);

  try {
    // Get additional details and images in parallel
    const [details, imageData] = await Promise.all([
      getEnhancedPlaceDetails(place, apiKey, client),
      getRestaurantImages(place, apiKey)
    ]);

    // Transform Google's opening hours to match our OpeningHours type
    const openingHours: OpeningHours | null = details.opening_hours ? {
      openNow: details.opening_hours.open_now || false,
      periods: details.opening_hours.periods?.map(period => ({
        open: {
          day: period.open.day,
          time: period.open.time || ''
        },
        close: period.close ? {
          day: period.close.day,
          time: period.close.time || ''
        } : {
          day: period.open.day,
          time: '2359' // Default closing time if not specified
        }
      })) || [],
      weekdayText: details.opening_hours.weekday_text || []
    } : null;

    // Enhance the base restaurant
    const enhancedRestaurant: Restaurant = {
      ...baseRestaurant,
      phone: details.formatted_phone_number || null,
      website: details.website || null,
      openingHours,
      imageUrl: imageData.imageUrl,
      yelpId: imageData.yelpData?.id || null,
      yelpRating: imageData.yelpData?.rating || null,
      hasYelpData: !!imageData.yelpData,
      priceLevel: details.price_level?.toString() || null,
    };

    await saveRestaurant(enhancedRestaurant, {
      updateCounts: true,
      imageUrl: imageData.imageUrl
    });

    return enhancedRestaurant;

  } catch (error) {
    await saveRestaurant(baseRestaurant, { updateCounts: true });
    return baseRestaurant;
  }
}


// ----------------
// Main Route Handler
// ----------------

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
    const existingIds = new Set<string>();
    let combinedResults: CachedRestaurant[] = [];

    // 1. Get cached results
    const cachedRestaurants = await getCachedRestaurantsForLocation(params.lat, params.lng);
    
    if (cachedRestaurants?.length) {
      cachedRestaurants.forEach(r => existingIds.add(r.id));
      
      const nearbyCached = cachedRestaurants.filter(restaurant => {
        const distance = calculateDistance(
          params.lat, params.lng, 
          restaurant.latitude, 
          restaurant.longitude
        );
        return distance <= CONFIG.SEARCH.PRECISE.RADIUS;
      });

      combinedResults = [...nearbyCached];
      metrics.cachedCount = nearbyCached.length;
    }

    // 2. Always fetch precise location results
    const { results: newPlaces, apiCalls } = await fetchPreciseLocationResults(
      params.lat,
      params.lng,
      googleMapsClient,
      apiKey,
      existingIds
    );

    metrics.apiCalls = apiCalls;
    metrics.newPlaces = newPlaces.length;

    // Process and merge new results
    if (newPlaces.length > 0) {
      const processedNewPlaces = await Promise.all(
        newPlaces.map(place => processPlaceDetails(place, apiKey))
      );
    
      // Add new places to the combined results
      const newRestaurants = processedNewPlaces.filter(newPlace => 
        !combinedResults.some(existing => 
          existing.id === newPlace.id || 
          calculateDistance(
            existing.latitude,
            existing.longitude,
            newPlace.latitude,
            newPlace.longitude
          ) < CONFIG.SEARCH.PRECISE.MERGE_DISTANCE
        )
      );
    
      console.log(`Processing summary:`);
      console.log(`- New places processed: ${processedNewPlaces.length}`);
      console.log(`- Unique new restaurants: ${newRestaurants.length}`);
      
      // Update cache with all results
      await saveCachedRestaurantsForLocation(
        params.lat, 
        params.lng, 
        [...combinedResults, ...newRestaurants]
      );
    
      // Update Firestore documents
      await batchUpdateRestaurants(newRestaurants);
    
      // Update the combined results for the response
      combinedResults = [...combinedResults, ...newRestaurants];
    }

    // Sort by distance and apply limit
    combinedResults = combinedResults
      .sort((a, b) => {
        const distA = calculateDistance(params.lat, params.lng, a.latitude, a.longitude);
        const distB = calculateDistance(params.lat, params.lng, b.latitude, b.longitude);
        return distA - distB;
      })
      .slice(0, params.limit);

    // Get location details
    const { county, townName } = await determineLocationDetails(params.lat, params.lng);
    const now = Date.now();

  
    const gridKey = getLocationCacheKey(params.lat, params.lng);
   
    return NextResponse.json({
      restaurants: combinedResults.map(restaurant => ({
        ...restaurant,
        // Ensure all required fields from Restaurant interface are present
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        rating: restaurant.rating,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        county: restaurant.county,
        townName: restaurant.townName,
        menuCount: restaurant.menuCount || 0, // Required field
        // Optional fields with defaults
        hasMenu: !!restaurant.menuCount,
        hasDetailsFetched: true,
        openingHours: restaurant.openingHours || null,
        priceLevel: restaurant.priceLevel || null,
        phone: restaurant.phone || null,
        website: restaurant.website || null
      })),
      county,
      metadata: {
        total: combinedResults.length,
        returned: Math.min(combinedResults.length, params.limit),
        gridKey,
        metrics: {
          apiCalls: metrics.apiCalls,
          newRestaurants: metrics.newPlaces,
          cachedRestaurants: metrics.cachedCount,
          searchRadius: PRECISE.RADIUS,
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

// Add new helper function
async function fetchPreciseLocationResults(
  lat: number,
  lng: number,
  client: Client,
  apiKey: string,
  existingIds: Set<string>
): Promise<{ results: PlaceData[]; apiCalls: number }> {
  let allResults: PlaceData[] = [];
  let pageToken: string | undefined;
  let apiCalls = 0;
  const maxRetries = 3;
  
  console.log('\n=== Restaurant Search Summary ===');
  console.log(`Starting location: ${lat}, ${lng}`);
  console.log(`Existing cached restaurants: ${existingIds.size}`);
  
  do {
    try {
      if (pageToken) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const params = {
        params: {
          location: { lat, lng },
          rankby: PlacesNearbyRanking.distance,
          keyword: 'restaurant|餐廳|food|cafe',
          key: apiKey,
          ...(pageToken ? { pagetoken: pageToken } : {})
        }
      };

      const response = await client.placesNearby(params);
      // This returns up to 20 results in one API call
      apiCalls++;

      if (response.data.status === 'OK') {
        const validResults = response.data.results
          .filter(place => isValidEstablishment(place))
          .filter(place => !existingIds.has(place.place_id!))
          .filter(isCompletePlaceData);

        console.log(`API Call ${apiCalls}:`);
        console.log(`- Total results: ${response.data.results.length}`);
        console.log(`- Valid new restaurants: ${validResults.length}`);
        
        allResults.push(...validResults);
        pageToken = response.data.next_page_token;

        console.log(`Cumulative total: ${allResults.length} new restaurants`);
      } else if (response.data.status === 'ZERO_RESULTS') {
        console.log('No new restaurants found in this area');
        break;
      } else {
        console.warn(`Places API returned status: ${response.data.status}`);
        break;
      }

      if (apiCalls >= PRECISE.MAX_API_CALLS || 
          allResults.length >= PRECISE.MAX_RESULTS) {
        console.log(`Reached limit: ${apiCalls} API calls, ${allResults.length} results`);
        break;
      }

    } catch (error) {
      console.error('Error fetching from Places API:', error);
      if (apiCalls >= maxRetries) {
        console.log('Max retries reached, stopping API calls');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } while (pageToken);

  console.log('\nFinal Results:');
  console.log(`- Total API calls made: ${apiCalls}`);
  console.log(`- New restaurants found: ${allResults.length}`);
  console.log(`- Total restaurants (including cached): ${existingIds.size + allResults.length}`);
  console.log('===========================\n');

  return { results: allResults, apiCalls };
}