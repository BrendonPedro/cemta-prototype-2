import { Client, PlacesNearbyRanking } from "@googlemaps/google-maps-services-js";
import { CONFIG } from '@/lib/database-builder/config';
import { determineLocation } from '@/app/services/location/locationService';
import { cacheService, getLocationCacheKey } from '@/app/services/cacheService';
import { mapStateCache } from '@/app/services/cache/mapStateCache';
import { getYelpBusinessWithPhotos } from '@/app/services/yelp/yelpService';
import { uploadImageToBucket } from '@/app/services/gcpBucketStorage';
import { calculateDistance } from '@/app/utils/locationUtils';
import { validateTaiwanCoordinates } from '@/config/googleMapsConfig';
import { 
  writeBatch, 
  serverTimestamp,
  doc,
  getDoc 
} from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';
import type { 
  Restaurant, 
  CachedRestaurant,
  SaveRestaurantOptions,
  SaveRestaurantResult, 
} from '@/app/services/restaurant/types';

// Helper functions
async function processImagesInBatches(
  images: { url: string; restaurantId: string; source: 'google' | 'yelp' }[],
  firebaseToken: string | null
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  if (!images?.length || !firebaseToken) {
    console.log(firebaseToken ? 'No images to process' : 'No Firebase token');
    return results;
  }
  
  for (let i = 0; i < images.length; i += CONFIG.SEARCH.BATCH_SIZE) {
    const batch = images.slice(i, i + CONFIG.SEARCH.BATCH_SIZE);
    
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

export async function saveRestaurantImage(
  imageUrl: string,
  restaurantId: string,
  source: 'google' | 'yelp'
): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `${restaurantId}/${Date.now()}_${source}.jpg`;
    return await uploadImageToBucket(
      fileName,
      buffer,
      'image/jpeg'
    );
  } catch (error) {
    console.error(`Error saving ${source} image for ${restaurantId}:`, error);
    return imageUrl;
  }
}

// Core restaurant functions
export async function getNearbyRestaurants(
  lat: number,
  lng: number,
  firebaseToken: string | null
): Promise<{ 
  restaurants: CachedRestaurant[]; 
  metrics: any;
}> {
  // Validate coordinates
  if (!validateTaiwanCoordinates(lat, lng)) {
    throw new Error('Coordinates outside Taiwan bounds');
  }

  const cacheKey = getLocationCacheKey(lat, lng);
  console.log(`Checking cache for restaurants at ${cacheKey}`);

  // Check cache first
  const cachedResults = await cacheService.get<CachedRestaurant[]>(
    cacheKey,
    CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS
  );

  if (cachedResults?.length) {
    console.log(`Cache hit: Found ${cachedResults.length} restaurants`);
    return {
      restaurants: cachedResults,
      metrics: {
        fromCache: cachedResults.length,
        apiCalls: 0
      }
    };
  }

  // Get location details
  const locationDetails = await determineLocation(lat, lng);
  
  // Fetch from API if not in cache
  let apiCalls = 0;
  const metrics = {
    googlePhotos: 0,
    yelpCalls: 0,
    restaurantsWithPhotos: 0,
    restaurantsWithYelp: 0
  };

  try {
    const client = new Client({});
    const response = await client.placesNearby({
      params: {
        location: { lat, lng },
        rankby: PlacesNearbyRanking.distance,
        keyword: 'restaurant|餐廳|food|cafe',
        key: process.env.GOOGLE_MAPS_API_KEY!
      }
    });
    apiCalls++;

    if (!response.data.results?.length) {
      console.log('No restaurants found in this area');
      return {
        restaurants: [],
        metrics: { apiCalls }
      };
    }

    // Process restaurants
    const restaurants = await Promise.all(
      response.data.results.map(async place => {
        const restaurant: CachedRestaurant = {
          id: place.place_id!,
          name: place.name!,
          address: place.vicinity!,
          rating: place.rating || 0,
          latitude: place.geometry!.location.lat,
          longitude: place.geometry!.location.lng,
          county: locationDetails.county,
          townName: locationDetails.townName,
          menuCount: 0,
          hasGoogleData: true,
          hasYelpData: false,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };

        return restaurant;
      })
    );

    // Process images and Yelp data
    const processedRestaurants = await enrichRestaurantData(
      restaurants,
      firebaseToken,
      metrics
    );

    // Save to cache
    await cacheService.set(
      cacheKey, 
      processedRestaurants,
      CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS
    );

    return {
      restaurants: processedRestaurants,
      metrics: {
        apiCalls,
        ...metrics
      }
    };

  } catch (error) {
    console.error('Error fetching restaurants:', error);
    throw error;
  }
}

async function enrichRestaurantData(
  restaurants: CachedRestaurant[],
  firebaseToken: string | null,
  metrics: {
    googlePhotos: number;
    yelpCalls: number;
    restaurantsWithPhotos: number;
    restaurantsWithYelp: number;
  }
): Promise<CachedRestaurant[]> {
  // Process Yelp data for restaurants without Google photos
  const restaurantsNeedingYelpData = restaurants.filter(restaurant => 
    !restaurant.imageUrl || restaurant.imageUrl.includes('placeholder')
  );
  
  for (const restaurant of restaurantsNeedingYelpData) {
    try {
      if (!process.env.NEXT_PUBLIC_YELP_API_KEY) {
        console.warn('Skipping Yelp data fetch - API key not configured');
        continue;
      }

      metrics.yelpCalls++;
      const yelpData = await getYelpBusinessWithPhotos(
        restaurant.name,
        restaurant.latitude,
        restaurant.longitude
      );
  
      if (yelpData) {
        metrics.restaurantsWithYelp++;
        if (yelpData.photos?.length) {
          const yelpImageUrl = await saveRestaurantImage(
            yelpData.photos[0],
            restaurant.id,
            'yelp'
          );
          restaurant.imageUrl = yelpImageUrl;
          restaurant.hasYelpData = true;
          restaurant.rating = Math.max(restaurant.rating, yelpData.rating || 0);
          metrics.restaurantsWithPhotos++;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch Yelp data for ${restaurant.name}:`, error);
      continue;
    }
  }

  return restaurants;
}

export async function saveRestaurant(
  restaurantData: Partial<Restaurant>,
  options: SaveRestaurantOptions = {}
): Promise<SaveRestaurantResult> {
  const {
    imageUrl,
    incrementalUpdate = true,
    batch: existingBatch,
    updateCounts = true,
    signal
  } = options;

  if (!restaurantData.id || !restaurantData.county || !restaurantData.townName) {
    throw new Error('Missing required restaurant information');
  }

  try {
    if (signal?.aborted) {
      throw new Error('Operation aborted');
    }

    const batch = existingBatch || writeBatch(db);
    const now = new Date().toISOString();
    
    // Default data
    const firestoreData = {
      menuCount: 0,
      hasGoogleData: false,
      hasYelpData: false,
      photos: [],
      lastUpdated: serverTimestamp(),
      createdAt: serverTimestamp(),
      ...restaurantData,
      ...(imageUrl && { imageUrl })
    };

    // Save to collections
    const restaurantRef = doc(db, CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS, restaurantData.id);
    const countyRef = doc(db, CONFIG.FIRESTORE.COLLECTIONS.COUNTIES, restaurantData.county);
    
    batch.set(restaurantRef, firestoreData, { merge: incrementalUpdate });

    if (!existingBatch) {
      await batch.commit();
    }

    return {
      success: true,
      restaurantId: restaurantData.id
    };

  } catch (error) {
    console.error('Error saving restaurant:', error);
    return {
      success: false,
      restaurantId: restaurantData.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getRestaurant(restaurantId: string): Promise<Restaurant | null> {
  try {
    const restaurantRef = doc(db, CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS, restaurantId);
    const docSnap = await getDoc(restaurantRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Restaurant;
    }
    return null;
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    return null;
  }
}

export async function getTopRatedRestaurants(
  lat: number,
  lng: number,
  limit: number = 10
): Promise<CachedRestaurant[]> {
  const cacheKey = getLocationCacheKey(lat, lng);
  const cachedRestaurants = await cacheService.get<CachedRestaurant[]>(cacheKey);

  if (cachedRestaurants?.length) {
    return cachedRestaurants
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  // If not in cache, fetch new data
  const { restaurants } = await getNearbyRestaurants(lat, lng, null);
  return restaurants
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}