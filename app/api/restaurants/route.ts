// app/api/restaurants/route.ts

import { NextResponse } from "next/server";
import { batchUpdateRestaurants, getCachedRestaurantsForLocation, saveCachedRestaurantsForLocation } from "@/app/services/firebaseFirestore";
import { Timestamp } from "firebase/firestore";
import type { CachedRestaurant } from "@/app/services/firebaseFirestore";
import { determineLocationDetails } from "@/app/services/locationService";
import geohash from "ngeohash";
import { uploadRestaurantImage } from "@/app/services/gcpBucketStorage";
import { saveRestaurantData } from "@/app/services/firebaseFirestore";
import axios from "axios";
import { getYelpBusinessWithPhotos } from "@/app/services/yelpService";
import admin from "@/config/firebaseAdmin";
import { 
  Client, 
  PlaceData,
  PlacesNearbyRanking,
  PlaceType2,
  AddressType,
  PlaceType1
} from "@googlemaps/google-maps-services-js";
import { ApiError } from "@/config/googleCloudConfig";
import { DecodedIdToken } from "firebase-admin/auth";
import { EXCLUDED_ESTABLISHMENTS } from '@/app/constants/excludedEstablishments';
import { Language } from "@googlemaps/google-maps-services-js";

// Constants for rate limiting
const RATE_LIMIT = {
  REQUESTS_PER_MINUTE: 60,
  WINDOW_MS: 60 * 1000, // 1 minute
};

// Request parameters interface
interface RequestParams {
  lat: number;
  lng: number;
  limit: number;
  type: string;
}

// Rate limiting interface
interface RateLimitInfo {
  count: number;
  resetTime: number;
}

// Helper to validate token
async function validateFirebaseToken(authHeader: string | null): Promise<DecodedIdToken> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Verify token has not expired
    const tokenExp = decodedToken.exp * 1000; // Convert to milliseconds
    if (Date.now() >= tokenExp) {
      throw new Error('Token has expired');
    }

    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Invalid or expired token');
  }
}

// Parameter validation with strict checks
function validateRequestParams(searchParams: URLSearchParams): RequestParams {
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const type = searchParams.get("type") || "full";

  // Validate latitude is between -90 and 90
  const parsedLat = Number(lat);
  if (!lat || isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
    throw new Error("Invalid latitude value");
  }

  // Validate longitude is between -180 and 180
  const parsedLng = Number(lng);
  if (!lng || isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
    throw new Error("Invalid longitude value");
  }

  // Validate limit is within reasonable bounds
  if (isNaN(limit) || limit < 1 || limit > 100) {
    throw new Error("Limit must be between 1 and 100");
  }

  return {
    lat: parsedLat,
    lng: parsedLng,
    limit,
    type
  };
}

// Rate limiting check
async function checkRateLimit(userId: string): Promise<void> {
  const rateRef = admin.firestore()
    .collection('rateLimits')
    .doc(userId);

  const now = Date.now();
  
  await admin.firestore().runTransaction(async (transaction) => {
    const doc = await transaction.get(rateRef);
    const data = doc.data() as RateLimitInfo | undefined;
    
    if (!data || now >= data.resetTime) {
      // Reset rate limit if window has expired
      transaction.set(rateRef, {
        count: 1,
        resetTime: now + RATE_LIMIT.WINDOW_MS
      });
    } else if (data.count >= RATE_LIMIT.REQUESTS_PER_MINUTE) {
      throw new Error('Rate limit exceeded');
    } else {
      // Increment request count
      transaction.update(rateRef, {
        count: data.count + 1
      });
    }
  });
}

// Helper function to calculate distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

const googleMapsClient = new Client({});

async function processPlaceDetails(
  place: PlaceData,
  apiKey: string,
  client: Client = googleMapsClient
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

export async function GET(request: Request) {
  try {
    // Get Google Maps API key from environment
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key is not configured');
    }

    // 1. Authentication
    const decodedToken = await validateFirebaseToken(
      request.headers.get("authorization")
    );
    
    if (!decodedToken.uid) {
      return NextResponse.json(
        { error: "Unauthorized - invalid user ID" },
        { status: 401 }
      );
    }

    // 2. Rate Limiting
    await checkRateLimit(decodedToken.uid);

    // 3. Parameter Validation
    const { searchParams } = new URL(request.url);
    const params = validateRequestParams(searchParams);
    
    // 4. User Document Check
    const userRef = admin.firestore().collection('users').doc(decodedToken.uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User document not found" },
        { status: 404 }
      );
    }

    // 5. Process Request with Validated Parameters
    const now = Date.now();
    const gridKey = geohash.encode(params.lat, params.lng, 6);

    // Log request for audit purposes
    await admin.firestore().collection('requestLogs').add({
      userId: decodedToken.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      params,
      gridKey
    });

 
     
    // If no cache, fetch from Places API
    console.log("Cache miss, fetching from Places API");
    const client = new Client({});

    // Make Places API call first
    console.log("Fetching from Places API");
    const placesResponse = await googleMapsClient.placesNearby({
      params: {
        location: { lat: params.lat, lng: params.lng },
        radius: 50, // 50 meters for precision
        // Remove the type parameter to get all establishments
        // type: 'restaurant' as AddressType, // Remove this
        language: Language.zh_TW,
        key: apiKey,
        // Expanded keyword to catch more types of establishments
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
    
    const filteredResults = placesResponse.data.results.filter(place => {
      if (!place?.name) return false;
    
      const normalizedName = place.name.toLowerCase();
      
      // Check exclusions first
      const isExcluded = EXCLUDED_ESTABLISHMENTS.some(excluded => 
        normalizedName.includes(excluded.toLowerCase())
      );
    
      if (isExcluded) return false;
    
      // Check if it's any type of food establishment
      const validTypes = [
        'restaurant',
        'food',
        'meal_takeaway',
        'cafe',
        'meal_delivery',
        'bakery',
        'bar',
        'establishment',
        'point_of_interest'
      ];
    
      const isValidEstablishment = place.types?.some(type => 
        validTypes.includes(type.toLowerCase())
      );
    
      // Log what we found for debugging
      console.log(`Checking place: ${place.name}`, {
        types: place.types,
        isValid: isValidEstablishment,
        location: place.geometry?.location,
        address: place.vicinity
      });
    
      return isValidEstablishment;
    });

        // Now check cache
       console.log("Checking cache for location:", { lat: params.lat, lng: params.lng });
       const cachedRestaurants = await getCachedRestaurantsForLocation(params.lat, params.lng);
   
       if (cachedRestaurants?.length) {
         // Find new restaurants that aren't in cache
         const newRestaurants = filteredResults.filter(place => 
           !cachedRestaurants.some(cached => cached.id === place.place_id)
         );
       
         if (newRestaurants.length > 0) {
           // Process new restaurants with proper type handling
           const processedNewRestaurants = await Promise.all(
            newRestaurants.map(place => processPlaceDetails(place as PlaceData, apiKey))
          );
           
           const combinedRestaurants = [...cachedRestaurants, ...processedNewRestaurants];
           await saveCachedRestaurantsForLocation(params.lat, params.lng, combinedRestaurants);
           
           // Return combined results
           return NextResponse.json({
             restaurants: combinedRestaurants.slice(0, params.limit),
             county: combinedRestaurants[0]?.county || 'Unknown County',
             cached: false,
             lastUpdated: {
               county: now,
               restaurants: now,
               images: now,
             },
             metadata: {
               total: combinedRestaurants.length,
               returned: Math.min(combinedRestaurants.length, params.limit),
               gridKey,
               newlyAdded: processedNewRestaurants.length
             }
           });
         }
       
         // If no new restaurants, return cached results
         return NextResponse.json({
           restaurants: cachedRestaurants.slice(0, params.limit),
           county: cachedRestaurants[0]?.county || 'Unknown County',
           cached: true,
           lastUpdated: {
             county: now,
             restaurants: now,
             images: now,
           },
           metadata: {
             total: cachedRestaurants.length,
             returned: Math.min(cachedRestaurants.length, params.limit),
             gridKey
           }
         });
       }

    // Add detailed logging to help debug
    console.log('Search Parameters:', {
      location: { lat: params.lat, lng: params.lng },
      resultsFound: placesResponse.data.results.length,
      validRestaurants: filteredResults.length
    });
    
    console.log('Found Establishments:', 
      placesResponse.data.results.map(p => ({
        name: p.name,
        types: p.types,
        isRestaurant: p.types?.includes('restaurant' as AddressType), // Type assertion
        address: p.vicinity
      }))
    );

    const { county, townName } = await determineLocationDetails(params.lat, params.lng);



// Process all results if no cache exists
const restaurants: CachedRestaurant[] = await Promise.all(
  filteredResults
    .filter((place): place is PlaceData => 
      Boolean(place?.place_id && place?.name && place?.geometry?.location)
    )
    .map(place => processPlaceDetails(place, apiKey))
);

if (restaurants.length === 0) {
  console.warn('No valid restaurants found after filtering');
  console.log('Original results:', placesResponse.data.results.map(p => p.name));
  console.log('Filtered out:', placesResponse.data.results.filter(p => 
    !filteredResults.includes(p)).map(p => p.name)
  );
}

// Save to cache
if (restaurants.length > 0) {
  console.log(`Saving ${restaurants.length} filtered restaurants to cache`);
  await saveCachedRestaurantsForLocation(params.lat, params.lng, restaurants);
  await batchUpdateRestaurants(restaurants);
}

const response = {
  restaurants: restaurants.slice(0, params.limit),
  county,
  cached: false,
  lastUpdated: {
    county: now,
    restaurants: now,
    images: now
  },
  metadata: {
    total: restaurants.length,
    returned: Math.min(restaurants.length, params.limit),
    gridKey
  }
};

return NextResponse.json(response);

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