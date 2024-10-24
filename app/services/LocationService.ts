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
import { saveCachedRestaurantsForLocation, getCachedRestaurantsForLocation } from "./firebaseFirestore";

interface RequestCache {
  timestamp: number;
  promise: Promise<any>;
}

function getCacheKey(lat: number, lng: number): string {
  const roundedLat = Number(lat.toFixed(CACHE_CONFIG.MEMORY.PRECISION));
  const roundedLng = Number(lng.toFixed(CACHE_CONFIG.MEMORY.PRECISION));
  return `${roundedLat},${roundedLng}`;
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


// Add this helper function for image processing
async function processImagesInBatches(
  images: { url: string; restaurantId: string; source: 'google' | 'yelp' }[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  for (let i = 0; i < images.length; i += CACHE_CONFIG.IMAGES.MAX_CONCURRENT) {
    const batch = images.slice(i, i + CACHE_CONFIG.IMAGES.MAX_CONCURRENT);
    const batchResults = await Promise.all(
      batch.map(async ({ url, restaurantId, source }) => {
        let retries = 0;
        while (retries < CACHE_CONFIG.IMAGES.MAX_RETRIES) {
          try {
            const savedUrl = await saveRestaurantImage(url, restaurantId, source);
            return { restaurantId, url: savedUrl };
          } catch (error) {
            retries++;
            if (retries === CACHE_CONFIG.IMAGES.MAX_RETRIES) {
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

// cache constants 
const CACHE_CONFIG = {
  MEMORY: {
    WINDOW: 5000, // 5 seconds for memory cache
    PRECISION: 6  // Coordinate precision for cache keys
  },
  LOCATION: {
    DURATION: 60 * 24 * 60 * 60 * 1000, // 60 days for location data
    PRECISION: 6  // geohash precision
  },
  IMAGES: {
    DURATION: 90 * 24 * 60 * 60 * 1000, // 90 days for images
    MAX_CONCURRENT: 5,
    MAX_RETRIES: 3
  },
  API: {
    PLACES_RATE_LIMIT: 500,
    PLACES_INTERVAL: 60000, // 1 minute
    BATCH_SIZE: 10
  }
};

// Cache functions
function calculateGridKey(lat: number, lng: number): string {
  return geohash.encode(lat, lng, CACHE_CONFIG.LOCATION.PRECISION);
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
): Promise<{ restaurants: CachedRestaurant[]; metrics: any }> {
  const startTime = Date.now();
  const metrics = {
    googlePhotos: 0,
    yelpCalls: 0,
    restaurantsWithPhotos: 0,
    restaurantsWithYelp: 0
  };
  // Check rate limit
if (!checkRateLimit('google-places', CACHE_CONFIG.API.PLACES_RATE_LIMIT, CACHE_CONFIG.API.PLACES_INTERVAL)) {
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
 for (let i = 0; i < validPlaces.length; i += CACHE_CONFIG.API.BATCH_SIZE) {
  const batch = validPlaces.slice(i, i + CACHE_CONFIG.API.BATCH_SIZE);
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
    
    return {
    restaurants,
    metrics: {
      places: 1,
      geocoding: apiCallCount.count - 1,
      photos: metrics.googlePhotos,
      yelp: metrics.yelpCalls,
      withGooglePhotos: metrics.restaurantsWithPhotos,
      withYelpData: metrics.restaurantsWithYelp
    }
  };
});
  }

// Track ongoing requests by location
const activeRequests = new Map<string, {
  promise: Promise<any>;
  timestamp: number;
}>();

// Main export function
export async function getLocationData(lat: number, lng: number, apiKey: string) {
  const cacheKey = getCacheKey(lat, lng);
  const now = Date.now();

  // Check if there's an active request for this location
  const activeRequest = activeRequests.get(cacheKey);
  if (activeRequest && (now - activeRequest.timestamp < 5000)) { // 5 second window
    console.log(`Active request found for key: ${cacheKey}`);
    return activeRequest.promise;
  }

  console.log(`Starting new request for key: ${cacheKey}`);
  
const promise = (async () => {
  const startTime = Date.now();
  const requestMetrics = {
    apiCalls: {
      places: 0,
      geocoding: 0,
      photos: 0,
      yelp: 0
    },
    logged: false
  };

 try {
    // Check cache first
    const cachedRestaurants = await getCachedRestaurantsForLocation(lat, lng);
    if (cachedRestaurants) {
      const locationData = {
          gridKey: calculateGridKey(lat, lng),
          timestamp: now,
          geohash: calculateGridKey(lat, lng),
          county: cachedRestaurants[0]?.county || 'Unknown County',
          restaurants: cachedRestaurants,
          lastUpdated: {
            county: now,
            restaurants: now,
            images: now,
          },
          cached: true,
        };

    if (!requestMetrics.logged) {
        createAPILog(
          locationData.gridKey,
          true,
          startTime,
          { places: 0, geocoding: 0, photos: 0, yelp: 0 },
          {
            total: cachedRestaurants.length,
            fromCache: cachedRestaurants.length,
            withGooglePhotos: cachedRestaurants.filter(r => r.hasGoogleData).length,
            withYelpData: cachedRestaurants.filter(r => r.hasYelpData).length
          }
        );
        requestMetrics.logged = true;
      }

      return { ...locationData, apiCallCount: 0 };
    }

 
    // Fetch new data
    const apiCallCount = { count: 0 };
    const [county, restaurantsResult] = await Promise.all([
      getCountyName(lat, lng, apiKey, apiCallCount),
      getNearbyRestaurants(lat, lng, apiKey, apiCallCount)
    ]);

    const { restaurants, metrics: restaurantMetrics } = restaurantsResult;  // Rename to restaurantMetrics

    // Save to cache
    await saveCachedRestaurantsForLocation(lat, lng, restaurants);

    const locationData = {
      gridKey: calculateGridKey(lat, lng),
      timestamp: now,
      geohash: calculateGridKey(lat, lng),
      county,
      restaurants,
      lastUpdated: {
        county: now,
        restaurants: now,
        images: now,
      },
      cached: false
    };

    // Single API log for new data
    if (!requestMetrics.logged) {
      createAPILog(
        locationData.gridKey,
        false,
        startTime,
        {
          places: restaurantMetrics.places,
          geocoding: restaurantMetrics.geocoding,
          photos: restaurantMetrics.photos,
          yelp: restaurantMetrics.yelp
        },
        {
          total: restaurants.length,
          fromCache: 0,
          withGooglePhotos: restaurantMetrics.withGooglePhotos,
          withYelpData: restaurantMetrics.withYelpData
        }
      );
      requestMetrics.logged = true;
    }

      return { ...locationData, apiCallCount: apiCallCount.count };
    } finally {
      // Clean up the active request after completion
      setTimeout(() => {
        if (activeRequests.get(cacheKey)?.timestamp === now) {
          activeRequests.delete(cacheKey);
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


// Optional: Export individual functions for testing
export const _internal = {
  getCountyName,
  getNearbyRestaurants,
  saveRestaurantImage,
  calculateGridKey
};