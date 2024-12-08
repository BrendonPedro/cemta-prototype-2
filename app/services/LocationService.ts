// app/services/locationService.ts

import { db } from "@/config/firebaseConfig";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where,
  increment,
  Timestamp 
} from "firebase/firestore";
import { Client, Language, AddressType, PlaceType1, PlacesNearbyRanking } from "@googlemaps/google-maps-services-js";
import { uploadImageToBucket } from "./gcpBucketStorage";
import { getYelpBusinessWithPhotos } from "./yelpService";
import { CachedRestaurant } from "@/interfaces/restaurant/types";
import axios from 'axios';
import geohash from "ngeohash";
import { saveRestaurant } from "./firebaseFirestore";
import { measureAPICall, checkRateLimit } from '@/app/utils/apiUtils';
import { saveCachedRestaurantsForLocation, getCachedRestaurantsForLocation } from "./firebaseFirestore";
import { counties, getTownsByCounty } from '@/lib/data/counties';
import { getImageUrl } from './gcpBucketStorage';
import { EnhancedCountyData, EnhancedTownData } from '@/lib/data/counties';

//-----INTERFACES-----

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationDetails {
  county: string;
  townName: string;
}

interface NearestLocation {
  town: EnhancedTownData | null;
  county: EnhancedCountyData | null;
  distance: number;
}

interface RequestCache {
  timestamp: number;
  promise: Promise<any>;
}

interface APIMetricsLog {
  timestamp: string;
  gridKey: string;
  cached: boolean;
  apis: {
    googlemaps: {
      places: number;
      geocoding: number;
      photos: number;
    };
    yelp: number;
  };
  restaurants: {
    total: number;
    fromCache: number;
    newlyFetched: number;
    withGooglePhotos: number;
    withYelpData: number;
  };
  duration: number;
}

interface GooglePlace {
  place_id: string;
  name: string;
  vicinity?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  photos?: Array<{
    photo_reference: string;
    html_attributions: string[];
  }>;
}

interface LocationCache {
  gridKey: string;
  timestamp: Timestamp | { seconds: number; nanoseconds: number } | number;
  geohash: string;
  county: string;
  restaurants: CachedRestaurant[];
  lastUpdated: {
    county: Timestamp | { seconds: number; nanoseconds: number } | number;
    restaurants: Timestamp | { seconds: number; nanoseconds: number } | number;
    images: Timestamp | { seconds: number; nanoseconds: number } | number;
  };
  cached?: boolean;
}

// -----CACHE CONSTANTS-----

// Constants
const EARTH_RADIUS_KM = 6371;
const DEFAULT_LOCATION: LocationDetails = {
  county: 'Unknown County',
  townName: 'Unknown Town'
};

const CACHE_CONFIG = {
  MEMORY: {
    WINDOW: 5000, // 5 seconds for memory cache
    PRECISION: 6  // Coordinate precision for cache keys
  },
  LOCATION: {
    DURATION: 365 * 24 * 60 * 60 * 1000, // 365 days for location data
    PRECISION: 6  // geohash precision
  },
  IMAGES: {
    DURATION: 365 * 24 * 60 * 60 * 1000, // 365 days for images
    MAX_CONCURRENT: 5,
    MAX_RETRIES: 3
  },
  API: {
    PLACES_RATE_LIMIT: 500,
    PLACES_INTERVAL: 60000, // 1 minute
    YELP_RATE_LIMIT: 500,  
    YELP_INTERVAL: 60000,  // 1 minute
    BATCH_SIZE: 10
  }
};

// Track ongoing requests by location
const activeRequests = new Map<string, {
  promise: Promise<any>;
  timestamp: number;
}>();

//-----HELPER FUNCTIONS-----

function getCacheKey(lat: number, lng: number): string {
  const roundedLat = Number(lat.toFixed(CACHE_CONFIG.MEMORY.PRECISION));
  const roundedLng = Number(lng.toFixed(CACHE_CONFIG.MEMORY.PRECISION));
  return `${roundedLat},${roundedLng}`;
}

// Cache functions
function calculateGridKey(lat: number, lng: number): string {
  return geohash.encode(lat, lng, CACHE_CONFIG.LOCATION.PRECISION);
}

// function to handle logging
function createAPILog(
  gridKey: string,
  isCached: boolean,
  startTime: number,
  apiCalls: {
    places?: number;
    geocoding?: number;
    photos?: number;
    yelp?: number;
  },
  restaurantStats: {
    total: number;
    fromCache: number;
    withGooglePhotos: number;
    withYelpData: number;
  }
): APIMetricsLog {
  const duration = Date.now() - startTime;
  
  const log: APIMetricsLog = {
    timestamp: new Date().toISOString(),
    gridKey,
    cached: isCached,
    apis: {
      googlemaps: {
        places: apiCalls.places || 0,
        geocoding: apiCalls.geocoding || 0,
        photos: apiCalls.photos || 0,
      },
      yelp: apiCalls.yelp || 0
    },
    restaurants: {
      total: restaurantStats.total,
      fromCache: restaurantStats.fromCache,
      newlyFetched: restaurantStats.total - restaurantStats.fromCache,
      withGooglePhotos: restaurantStats.withGooglePhotos,
      withYelpData: restaurantStats.withYelpData
    },
    duration
  };

  console.log('\n=== API Request Summary ===');
  console.log(`Grid Key: ${log.gridKey}`);
  console.log(`Cache Status: ${log.cached ? 'HIT' : 'MISS'}`);
  console.log('\nAPI Calls:');
  console.log(`- Google Places API: ${log.apis.googlemaps.places}`);
  console.log(`- Google Geocoding API: ${log.apis.googlemaps.geocoding}`);
  console.log(`- Google Photos API: ${log.apis.googlemaps.photos}`);
  console.log(`- Yelp API: ${log.apis.yelp}`);
  console.log('\nRestaurant Stats:');
  console.log(`- Total Restaurants: ${log.restaurants.total}`);
  console.log(`- From Cache: ${log.restaurants.fromCache}`);
  console.log(`- Newly Fetched: ${log.restaurants.newlyFetched}`);
  console.log(`- With Google Photos: ${log.restaurants.withGooglePhotos}`);
  console.log(`- With Yelp Data: ${log.restaurants.withYelpData}`);
  console.log(`\nTotal Duration: ${log.duration}ms`);
  console.log('========================\n');

  return log;
}

async function processImagesInBatches(
  images: { url: string; restaurantId: string; source: 'google' | 'yelp' }[],
  firebaseToken: string | null
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  if (!images || images.length === 0) {
    console.log('No images to process');
    return results;
  }
  
  if (!firebaseToken) {
    console.warn('No Firebase token provided - returning original URLs');
    images.forEach(({ url, restaurantId }) => {
      results.set(restaurantId, url);
    });
    return results;
  }

  for (let i = 0; i < images.length; i += CACHE_CONFIG.IMAGES.MAX_CONCURRENT) {
    const batch = images.slice(i, i + CACHE_CONFIG.IMAGES.MAX_CONCURRENT);
    
    const batchResults = await Promise.all(
      batch.map(async ({ url, restaurantId, source }) => {
        try {
          const response = await fetch('/api/storage', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${firebaseToken}`
            },
            body: JSON.stringify({
              imageUrl: url,
              metadata: {
                type: 'restaurant',
                source,
                restaurantId,
                filename: `${Date.now()}_${source}.jpg`,
                contentType: 'image/jpeg'
              }
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to upload image: ${response.statusText}`);
          }

          const data = await response.json();
          return { restaurantId, url: data.url };
        } catch (error) {
          console.error(`Failed to process image for ${restaurantId}:`, error);
          return { restaurantId, url };
        }
      })
    );

    batchResults.forEach(result => {
      if (result) {
        results.set(result.restaurantId, result.url);
      }
    });
  }
  
  return results;
}

//Calculates the distance between two points on Earth using the Haversine formula
function calculateHaversineDistance(point1: Coordinates, point2: Coordinates): number {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  
  const dLat = toRadians(point2.lat - point1.lat);
  const dLon = toRadians(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return EARTH_RADIUS_KM * c;
}

// ----CORE LOCATION FUNCTIONS-----

//Determines the nearest county and town based on provided coordinates
export async function determineLocationDetails(lat: number, lng: number): Promise<LocationDetails> {
  try {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Invalid coordinates provided');
    }

    const userLocation: Coordinates = { lat, lng };
    let nearestLocation: NearestLocation = {
      town: null,
      county: null,
      distance: Infinity
    };

    // Find the nearest town and its county
    for (const county of counties) {
      for (const town of county.towns) {
        const distance = calculateHaversineDistance(
          userLocation,
          town.location
        );

        if (distance < nearestLocation.distance) {
          nearestLocation = {
            town: town,
            county: county,
            distance
          };
        }
      }
    }

    // Validate results
    if (!nearestLocation.county || !nearestLocation.town) {
      console.warn('No nearby locations found for coordinates:', { lat, lng });
      return DEFAULT_LOCATION;
    }

    return {
      county: nearestLocation.county.name,
      townName: nearestLocation.town.name
    };

  } catch (error) {
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      location: 'determineLocationDetails',
      params: { lat, lng }
    });

    return DEFAULT_LOCATION;
  }
}

// Location data functions
async function getCountyName(
  lat: number,
  lng: number,
  apiKey: string,
  apiCallCount: { count: number }
): Promise<string> {
  const client = new Client({});

  try {
    apiCallCount.count += 1; // Increment API call count

    const response = await client.reverseGeocode({
      params: {
        latlng: { lat, lng },
        key: apiKey,
        language: Language.en,
        result_type: [AddressType.administrative_area_level_2]
      },
    });

    const countyComponent = response.data.results?.[0]?.address_components
      .find(component => component.types.includes(AddressType.administrative_area_level_2));

    return countyComponent?.long_name || 'Unknown County';
  } catch (error) {
    console.error('Google Maps API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      location: 'getCountyName',
      params: { lat, lng, apiCallCount: apiCallCount.count }
    });
    return 'Unknown County';
  }
}

// Image handling
async function saveRestaurantImage(
  imageUrl: string,
  restaurantId: string,
  source: 'google' | 'yelp'
): Promise<string> {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer'
    });

    const fileName = `${restaurantId}/${Date.now()}_${source}.jpg`;
    return await uploadImageToBucket(
      fileName,
      Buffer.from(response.data),
      'image/jpeg'
    );
  } catch (error) {
    console.error(`Error saving ${source} image for ${restaurantId}:`, error);
    return imageUrl;
  }
}

//-----MAIN EXPORTED FUNCTIONS-----

export async function getNearbyRestaurants(
  lat: number,
  lng: number,
  apiKey: string,
  apiCallCount: { count: number },
  firebaseToken: string | null
): Promise<{ restaurants: CachedRestaurant[]; metrics: any }> {
  try {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'http://localhost:3000';

    const response = await fetch(
      `${baseUrl}/api/restaurants?lat=${lat}&lng=${lng}&type=full`,
      {
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch restaurants data');
    }

    const data = await response.json();
    apiCallCount.count += 1;

    // Initialize metrics
    const metrics = {
      googlePhotos: 0,
      yelpCalls: 0,
      restaurantsWithPhotos: 0,
      restaurantsWithYelp: 0
    };

    // Get location details
    const { county, townName } = await determineLocationDetails(lat, lng);

    // Process the response data
    if (!data.restaurants?.length) {
      return {
        restaurants: [],
        metrics: {
          places: apiCallCount.count,
          geocoding: 1,
          photos: 0,
          yelp: 0,
          withGooglePhotos: 0,
          withYelpData: 0
        }
      };
    }

    // Process restaurants and gather metrics
    for (const restaurant of data.restaurants as CachedRestaurant[]) {
      if (restaurant.hasGoogleData && restaurant.imageUrl && !restaurant.imageUrl.includes('placeholder')) {
        metrics.googlePhotos++;
        metrics.restaurantsWithPhotos++;
      }
      if (restaurant.hasYelpData) {
        metrics.yelpCalls++;
        metrics.restaurantsWithYelp++;
      }
    }
    
    // Save to Firestore if needed
    const restaurantsToSave = data.restaurants.map((restaurant: CachedRestaurant) => ({
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      rating: restaurant.rating,
      location: {
        lat: restaurant.latitude,
        lng: restaurant.longitude,
      },
      googlePlaceId: restaurant.id,
      menuCount: restaurant.menuCount,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      photos: restaurant.imageUrl ? [restaurant.imageUrl] : [],
      source: {
        google: restaurant.hasGoogleData,
        yelp: restaurant.hasYelpData
      },
      townName,
      county
    }));
    
    // Process images in batches if any new images
    const imageProcessingQueue = data.restaurants
      .filter((restaurant: CachedRestaurant) => 
        restaurant.hasGoogleData && !restaurant.imageUrl?.includes('placeholder')
      )
      .map((restaurant: CachedRestaurant) => ({
        url: restaurant.imageUrl!,
        restaurantId: restaurant.id,
        source: 'google' as const
      }));
    
    if (imageProcessingQueue.length > 0) {
      const processedImages = await processImagesInBatches(imageProcessingQueue, firebaseToken);
      // Update image URLs in the restaurant data
      data.restaurants = data.restaurants.map((restaurant: CachedRestaurant) => ({
        ...restaurant,
        imageUrl: processedImages.get(restaurant.id) || restaurant.imageUrl
      }));
    }
    
    // Process Yelp data for restaurants without Google photos
    const restaurantsNeedingYelpData = data.restaurants
      .filter((restaurant: CachedRestaurant) => 
        !restaurant.hasGoogleData || !restaurant.imageUrl || restaurant.imageUrl.includes('placeholder')
      );
    
    for (const restaurant of restaurantsNeedingYelpData as CachedRestaurant[]) {
      try {
        // Check if Yelp API key exists before making the call
        if (!process.env.NEXT_PUBLIC_YELP_API_KEY) {
          console.warn('Skipping Yelp data fetch - API key not configured');
          restaurant.hasYelpData = false;
          continue; // Skip to next restaurant
        }

        metrics.yelpCalls++;
        const yelpData = await getYelpBusinessWithPhotos(
          restaurant.name,
          restaurant.latitude,
          restaurant.longitude
        );
    
        if (yelpData) {
          metrics.restaurantsWithYelp++;
          if (yelpData.photos?.length > 0) {
            const yelpImageUrl = await saveRestaurantImage(
              yelpData.photos[0],
              restaurant.id,
              'yelp'
            );
            restaurant.imageUrl = yelpImageUrl;
            restaurant.hasYelpData = true;
            restaurant.rating = Math.max(restaurant.rating, yelpData.rating || 0);
          }
        }
      } catch (error) {
        // Handle error gracefully without throwing
        console.warn(`Failed to fetch Yelp data for ${restaurant.name}:`, error);
        restaurant.hasYelpData = false;
        // Continue with next restaurant instead of throwing
        continue;
      }
    }

    // Save processed data to cache
    await saveCachedRestaurantsForLocation(lat, lng, data.restaurants);

    return {
      restaurants: data.restaurants,
      metrics: {
        places: apiCallCount.count,
        geocoding: 1,
        photos: metrics.googlePhotos,
        yelp: metrics.yelpCalls,
        withGooglePhotos: metrics.restaurantsWithPhotos,
        withYelpData: metrics.restaurantsWithYelp
      }
    };
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    throw error;
  }
}

export async function getLocationData(
  lat: number,
  lng: number,
  apiKey: string,
  firebaseToken: string | null = null
): Promise<{
  gridKey: string;
  timestamp: number;
  geohash: string;
  county: string;
  restaurants: CachedRestaurant[];
  lastUpdated: {
    county: number | Timestamp;
    restaurants: number | Timestamp;
    images: number | Timestamp;
  };
  cached: boolean;
  apiCallCount?: number;
}> {
  const cacheKey = getCacheKey(lat, lng);
  const now = Date.now();

  // Check if there's an active request for this location
  const activeRequest = activeRequests.get(cacheKey);
  if (activeRequest && (now - activeRequest.timestamp < 5000)) {
    console.log(`Active request found for key: ${cacheKey}`);
    return activeRequest.promise;
  }

  console.log(`Starting new request for key: ${cacheKey}`);
  
  const promise = (async () => {
    const startTime = Date.now();
    const gridKey = calculateGridKey(lat, lng);

    try {
      // Check cache first
      console.log(`Checking cache for location: ${lat},${lng}`);
      const cachedRestaurants = await getCachedRestaurantsForLocation(lat, lng);
      
      if (cachedRestaurants?.length) {
        console.log(`Found ${cachedRestaurants.length} restaurants in cache`);
        const locationData = {
          gridKey,
          timestamp: now,
          geohash: gridKey,
          county: cachedRestaurants[0]?.county || 'Unknown County',
          restaurants: cachedRestaurants,
          lastUpdated: {
            county: now,
            restaurants: now,
            images: now,
          },
          cached: true,
        };

        console.log(`Cache HIT for location: ${lat},${lng}`);
        return { ...locationData, apiCallCount: 0 };
      }

      console.log(`Cache MISS for location: ${lat},${lng}`);
      const { county } = await determineLocationDetails(lat, lng);

      // Return empty state for cache miss - data will be fetched by the API route
      return {
        gridKey,
        timestamp: now,
        geohash: gridKey,
        county,
        restaurants: [],
        lastUpdated: {
          county: now,
          restaurants: now,
          images: now,
        },
        cached: false,
        apiCallCount: 0
      };

    } catch (error) {
      console.error('Error in getLocationData:', {
        error: error instanceof Error ? error.message : String(error),
        location: 'getLocationData',
        params: { lat, lng, cacheKey },
        timestamp: now,
        duration: Date.now() - startTime
      });
      throw error;
    } finally {
      // Clean up the active request after completion
      setTimeout(() => {
        if (activeRequests.get(cacheKey)?.timestamp === now) {
          activeRequests.delete(cacheKey);
          console.log(`Cleaned up request for key: ${cacheKey}`);
        }
      }, 5000);
    }
  })();

  // Store the active request
  activeRequests.set(cacheKey, {
    promise,
    timestamp: now
  });

  return promise;
}

export async function getTopRatedRestaurants(
  lat: number,
  lng: number,
  limit: number = 10,
  firebaseToken: string | null
): Promise<CachedRestaurant[]> {
  try {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'http://localhost:3000';

    const response = await fetch(
      `${baseUrl}/api/restaurants?lat=${lat}&lng=${lng}&type=top_rated&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch top-rated restaurants');
    }

    const data = await response.json();
    return data.restaurants || [];
  } catch (error) {
    console.error('Error fetching top-rated restaurants:', error);
    throw error;
  }
}