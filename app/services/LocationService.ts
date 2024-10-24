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
import { checkExistingMenuForRestaurant, CachedRestaurant } from "./firebaseFirestore";
import axios from 'axios';
import geohash from "ngeohash";
import { createOrUpdateRestaurant } from "./firebaseFirestore";
import { measureAPICall, checkRateLimit } from '@/app/utils/apiUtils';

interface RequestCache {
  timestamp: number;
  promise: Promise<any>;
}

const requestCache = new Map<string, RequestCache>();
const CACHE_WINDOW = 2000; // 2 seconds

// Add this helper function
function getCacheKey(lat: number, lng: number): string {
  // Round to 6 decimal places to avoid floating point precision issues
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
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

const CACHE_STRATEGIES = {
  LOCATION: {
    DURATION: 60 * 24 * 60 * 60 * 1000, // 60 days for location data
    PRECISION: 6 // geohash precision
  },
  IMAGES: {
    DURATION: 90 * 24 * 60 * 60 * 1000, // 90 days for images
    MAX_SIZE: 1000 // maximum number of cached images
  }
};

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

// Types
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

// Add these constant configurations at the top of your file
const API_CONFIGS = {
  PLACES_API: {
    RATE_LIMIT: 500,
    INTERVAL: 60000, // 1 minute
    BATCH_SIZE: 10
  },
  IMAGES: {
    MAX_CONCURRENT: 5,
    MAX_RETRIES: 3
  }
};

// Add this helper function for image processing
async function processImagesInBatches(
  images: { url: string; restaurantId: string; source: 'google' | 'yelp' }[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  // Process images in smaller batches to avoid overwhelming the server
  for (let i = 0; i < images.length; i += API_CONFIGS.IMAGES.MAX_CONCURRENT) {
    const batch = images.slice(i, i + API_CONFIGS.IMAGES.MAX_CONCURRENT);
    const batchResults = await Promise.all(
      batch.map(async ({ url, restaurantId, source }) => {
        let retries = 0;
        while (retries < API_CONFIGS.IMAGES.MAX_RETRIES) {
          try {
            const savedUrl = await saveRestaurantImage(url, restaurantId, source);
            return { restaurantId, url: savedUrl };
          } catch (error) {
            retries++;
            if (retries === API_CONFIGS.IMAGES.MAX_RETRIES) {
              console.error(`Failed to save image after ${retries} attempts:`, error);
              return { restaurantId, url }; // Return original URL on failure
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
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

// Constants
const CACHE_DURATION = 60 * 24 * 60 * 60 * 1000; // 60 days
const GRID_SIZE = 0.02; // ~2km grid
const GEOHASH_PRECISION = 6;

// Cache functions
function calculateGridKey(lat: number, lng: number): string {
  return geohash.encode(lat, lng, GEOHASH_PRECISION);
}

async function getCachedLocation(lat: number, lng: number): Promise<LocationCache | null> {
  const gridKey = calculateGridKey(lat, lng);
  const cacheRef = doc(db, 'locationCache', gridKey);
  const cacheDoc = await getDoc(cacheRef);

  if (cacheDoc.exists()) {
    const data = cacheDoc.data() as LocationCache;
    const dataTimestampMillis = getMillisFromTimestamp(data.timestamp);

    if (Date.now() - dataTimestampMillis < CACHE_DURATION) {
      await updateCacheMetrics(gridKey, 'hit');
      return data;
    }
  }

  await updateCacheMetrics(gridKey, 'miss');
  return null;
}

function getMillisFromTimestamp(timestamp: any): number {
  if (timestamp instanceof Timestamp) {
    return timestamp.toMillis();
  } else if (typeof timestamp === 'object' && timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
    const ts = new Timestamp(timestamp.seconds, timestamp.nanoseconds);
    return ts.toMillis();
  } else if (typeof timestamp === 'number') {
    return timestamp;
  } else {
    console.error('Invalid timestamp format:', timestamp);
    throw new Error('Invalid timestamp format');
  }
}

async function updateCacheMetrics(gridKey: string, type: 'hit' | 'miss'): Promise<void> {
  const metricsRef = doc(db, 'cacheMetrics', gridKey);
  await setDoc(metricsRef, {
    [type]: increment(1),
    lastAccess: Timestamp.now(),
  }, { merge: true });
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
    return 'Unknown County';
  }
}

export async function getNearbyRestaurants(
  lat: number,
  lng: number,
  apiKey: string,
  apiCallCount: { count: number }
): Promise<CachedRestaurant[]> {
  const startTime = Date.now();
  const metrics = {
    googlePhotos: 0,
    yelpCalls: 0,
    restaurantsWithPhotos: 0,
    restaurantsWithYelp: 0
  };
  // Check rate limit
  if (!checkRateLimit('google-places', 500, 60000)) {
    throw new Error('Rate limit exceeded for Google Places API');
  }

  return await measureAPICall('google-places', async () => {
    const client = new Client({});
    apiCallCount.count += 1;

    // Get county name once for all restaurants in this request
    const gridCounty = await getCountyName(lat, lng, apiKey, apiCallCount);

    const response = await client.placesNearby({
      params: {
        location: { lat, lng },
        rankby: PlacesNearbyRanking.distance,
        type: PlaceType1.restaurant,
        key: apiKey,
      },
    });

    if (response.data.status !== "OK") {
      throw new Error(`Google Maps API returned status: ${response.data.status}`);
    }

    // Filter valid places and ensure all required fields are present
    const validPlaces = response.data.results.filter((place): place is NonNullable<typeof place> => {
      return Boolean(
        place?.place_id &&
        place?.name &&
        place?.geometry?.location?.lat &&
        place?.geometry?.location?.lng
      );
    });

    // imageProcessingQueue code
const imageProcessingQueue = validPlaces
  .filter((place): place is NonNullable<typeof place> & { place_id: string } => 
    Boolean(
      place?.place_id && 
      place?.photos?.[0]?.photo_reference
    )
  )
  .map(place => ({
    url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos![0].photo_reference}&key=${apiKey}`,
    restaurantId: place.place_id,
    source: 'google' as const
  }));

const processedImages = await processImagesInBatches(imageProcessingQueue);

    // Process restaurants in batches of 10 for better performance
    const restaurants: CachedRestaurant[] = [];
    for (let i = 0; i < validPlaces.length; i += 10) {
      const batch = validPlaces.slice(i, i + 10);
      const batchResults = await Promise.all(
        batch.map(async (place) => {
          if (!place.place_id || !place.name || !place.geometry?.location) {
            return null;
          }

          // Default or fallback values
          const defaultImageUrl = "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1074&q=80";
          
          const hasMenu = await checkExistingMenuForRestaurant(place.place_id);
          
          let imageUrl = defaultImageUrl;
           if (place.photos?.[0]?.photo_reference) {
    metrics.googlePhotos++;
    metrics.restaurantsWithPhotos++;
            const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`;
            imageUrl = await saveRestaurantImage(googlePhotoUrl, place.place_id, 'google');
          }

          // Create base restaurant object with non-null assertions where we've already checked
          const baseRestaurant: CachedRestaurant = {
            id: place.place_id,
            name: place.name,
            address: place.vicinity || "Unknown address",
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            rating: place.rating || 0,
            hasMenu,
            menuCount: hasMenu ? 1 : 0,
            county: gridCounty,
            source: 'google' as const,
            hasGoogleData: true,
            imageUrl: processedImages.get(place.place_id) || defaultImageUrl
};

          // Only fetch Yelp data if no Google photos available
          if (!place.photos?.length) {
            try {
              metrics.yelpCalls++;
              const yelpData = await getYelpBusinessWithPhotos(
                place.name,
                place.geometry.location.lat,
                place.geometry.location.lng
              );  if (yelpData) {
        metrics.restaurantsWithYelp++;
      }

              if (yelpData && yelpData.photos && yelpData.photos.length > 0) {
                const yelpImageUrl = await saveRestaurantImage(
                  yelpData.photos[0],
                  place.place_id,
                  'yelp'
                );

                return {
                  ...baseRestaurant,
                  yelpId: yelpData.id,
                  hasYelpData: true,
                  imageUrl: yelpImageUrl || baseRestaurant.imageUrl,
                  rating: Math.max(baseRestaurant.rating, yelpData.rating || 0)
                };
              }
            } catch (error) {
              console.warn(`Failed to fetch Yelp data for ${place.name}:`, error);
            }
          }

          // Create or update restaurant document in Firestore
          await createOrUpdateRestaurant(place.place_id, {
            name: place.name,
            address: place.vicinity || 'No Address Available',
            rating: place.rating || 0,
            location: {
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
            },
            county: gridCounty,
          });

          return baseRestaurant;
        })
      );
      
      // Filter out any null results and add to restaurants array
      const validResults = batchResults.filter((r): r is CachedRestaurant => r !== null);
      restaurants.push(...validResults);
    }
    
     createAPILog(
    calculateGridKey(lat, lng),
    false,
    startTime,
    {
      places: 1,
      geocoding: apiCallCount.count - 1,
      photos: metrics.googlePhotos,
      yelp: metrics.yelpCalls
    },
    {
      total: restaurants.length,
      fromCache: 0,
      withGooglePhotos: metrics.restaurantsWithPhotos,
      withYelpData: metrics.restaurantsWithYelp
    }
  );

  return restaurants;
  });
}


// Main export function
export async function getLocationData(
  lat: number,
  lng: number,
  apiKey: string
) {
  const cacheKey = getCacheKey(lat, lng);
  const now = Date.now();
  const cached = requestCache.get(cacheKey);

  // If we have a cached request that's still fresh, return it
  if (cached && (now - cached.timestamp) < CACHE_WINDOW) {
    return cached.promise;
  }

  // Create the new request
  const promise = (async () => {
    const startTime = Date.now();
    const gridKey = calculateGridKey(lat, lng);
    const apiCallCount = { count: 0 };

    const cachedData = await getCachedLocation(lat, lng);
    if (cachedData) {
      createAPILog(
        gridKey,
        true,
        startTime,
        { places: 0, geocoding: 0, photos: 0, yelp: 0 },
        {
          total: cachedData.restaurants.length,
          fromCache: cachedData.restaurants.length,
          withGooglePhotos: cachedData.restaurants.filter(r => r.hasGoogleData).length,
          withYelpData: cachedData.restaurants.filter(r => r.hasYelpData).length
        }
      );
      return { ...cachedData, cached: true, apiCallCount: 0 };
    }

    const [county, restaurants] = await Promise.all([
      getCountyName(lat, lng, apiKey, apiCallCount),
      getNearbyRestaurants(lat, lng, apiKey, apiCallCount),
    ]);

    const locationData: LocationCache = {
      gridKey,
      timestamp: Timestamp.now(),
      geohash: gridKey,
      county,
      restaurants,
      lastUpdated: {
        county: Timestamp.now(),
        restaurants: Timestamp.now(),
        images: Timestamp.now(),
      },
      cached: false,
    };

    await setDoc(doc(db, 'locationCache', gridKey), locationData);

    createAPILog(
      gridKey,
      false,
      startTime,
      {
        places: 1,
        geocoding: apiCallCount.count - 1,
        photos: restaurants.filter(r => r.hasGoogleData).length,
        yelp: restaurants.filter(r => r.hasYelpData).length
      },
      {
        total: restaurants.length,
        fromCache: 0,
        withGooglePhotos: restaurants.filter(r => r.hasGoogleData).length,
        withYelpData: restaurants.filter(r => r.hasYelpData).length
      }
    );

    return { ...locationData, apiCallCount: apiCallCount.count };
  })();

  // Cache the promise
  requestCache.set(cacheKey, {
    timestamp: now,
    promise
  });

  // Clean up old cache entries
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_WINDOW) {
      requestCache.delete(key);
    }
  }

  return promise;
}


// Optional: Export individual functions for testing
export const _internal = {
  getCountyName,
  getNearbyRestaurants,
  saveRestaurantImage,
  calculateGridKey
};