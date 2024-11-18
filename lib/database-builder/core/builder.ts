import { Client, PlacesNearbyRanking, Language } from '@googlemaps/google-maps-services-js';
import {
  createOrUpdateRestaurant,
  ensureCountyTownStructure,
  getCachedRestaurantsForLocation,
  saveRestaurantData,
  verifyAndFixRestaurantCount,
  trackApiUsage,
  type RestaurantDocument,
} from '@/app/services/firebaseFirestore';
import { uploadImageToBucket } from '@/app/services/gcpBucketStorage';
import type { CountyData, ProcessingStats, PlacePhoto, CachedRestaurant, RestaurantData } from '../types';
import { clearBuilderCache, getCachedBuildData, saveBuildCache } from '@/lib/database-builder/cache';
import { useImageUploader } from '@/lib/database-builder/services/image-handler';
import { processBatchImages, processAndUploadImage } from '@/lib/database-builder/services/image-handler-server';
import ngeohash from 'ngeohash';
import { CONFIG } from '../config';
import {
  getNextTownToProcess,
  trackAPICall,
  updateTownStatus,
  type QueuedTown
} from '@/lib/database-builder/queue-manager';
import { db } from '../db';
import { 
  writeBatch, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';

// ==================== Types & Interfaces ====================
export interface BuilderConfig {
  googleApiKey: string;
  yelpApiKey: string;
  projectId: string;
  keyFilename: string;
  firebaseToken?: string | null;
  clearCache?: {
    enabled: boolean;
    scope: 'town' | 'all';
  };
  maxResults?: number;
  testMode?: boolean;
  checkCacheOnly?: boolean;
  signal?: AbortSignal;
  aborted?: boolean;
  incrementalUpdate?: boolean;
}

interface GooglePlacePhoto {
  photo_reference: string;
  width: number;
  height: number;
  html_attributions: string[];
}

// Type guard for place data
function isValidPlace(place: any): place is { 
  place_id: string; 
  name: string; 
  vicinity?: string;
  rating?: number;
  geometry?: { 
    location: { 
      lat: number | (() => number); 
      lng: number | (() => number); 
    } 
  };
  photos?: GooglePlacePhoto[];
} {
  return (
    typeof place === 'object' &&
    typeof place.place_id === 'string' &&
    typeof place.name === 'string'
  );
}

// ==================== Helper Functions ====================
function validateFirebaseToken(token: string | null | undefined): token is string {
  if (!token) {
    console.warn('⚠️ No Firebase token provided');
    return false;
  }
  if (typeof token !== 'string') {
    console.warn('⚠️ Invalid Firebase token type');
    return false;
  }
  if (token.length < 10) {
    console.warn('⚠️ Firebase token appears invalid');
    return false;
  }
  return true;
}

async function clearCache(lat: number, lng: number, scope: 'town' | 'all' = 'town') {
  try {
    if (scope === 'town') {
      // Only clear specific town's cache
      const locationHash = ngeohash.encode(lat, lng, CONFIG.CACHE.GEOHASH.LOCATION_PRECISION);
      await clearBuilderCache(lat, lng);
    } else {
      // Clear all caches
      await clearBuilderCache();
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
  return; // Add explicit return
}

// Process and limit places
const processPlaces = (places: any[], maxResults: number) => {
  const validPlaces = places
    .filter(place => place?.place_id && place?.name && getPlaceLocation(place))
    .slice(0, maxResults);

  console.log(`📍 Found ${places.length} places, processing ${validPlaces.length} (limited by maxResults: ${maxResults})`);
  return validPlaces;
};

// ==================== Image Processing ====================

// Process photos for a place
async function processPlacePhotos(
  place: {
    place_id: string;
    name: string;
    photos?: GooglePlacePhoto[];
  },
  config: BuilderConfig,
  metadata: {
    countyName: string;
    townName: string;
  }
): Promise<string[]> {
  const photos: string[] = [];

  console.log('Processed photos:', photos);

  if (!config.firebaseToken) {
    console.log('⚠️ Skipping photo processing - No valid Firebase token');
    return photos;
  }

  if (place.photos && place.photos.length > 0) {
    console.log(`📸 Processing ${place.photos.length} photos for ${place.name}`);

    const photoRequests = place.photos.map((photo: GooglePlacePhoto) => ({
      url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${config.googleApiKey}`,
      metadata: {
        restaurantId: place.place_id,
        countyName: metadata.countyName,
        townName: metadata.townName,
        type: 'restaurant' as const,
        source: 'google' as const,
        filename: `${Date.now()}_${place.place_id}.jpg`
      }
    }));

    try {
      const uploadedUrls = await processBatchImages(
        photoRequests,
        config.firebaseToken
      );

      uploadedUrls.forEach((url) => {
        if (url) {
          console.log(`📷 Adding photo URL to photos array: ${url}`);
          photos.push(url);
        }
      });

      console.log(`✅ Successfully processed ${photos.length} photos for ${place.name}`);
    } catch (error) {
      console.error(`❌ Failed to process photos for ${place.name}:`, error);
    }
  }

  return photos;
}

async function uploadRestaurantImage(
  imageUrl: string,
  metadata: {
    restaurantId: string;
    countyName: string;
    townName: string;
  },
  config: BuilderConfig
): Promise<string | null> {
  if (!config.firebaseToken || typeof config.firebaseToken !== 'string') {
    console.warn('⚠️ Skipping photo upload - Invalid or missing Firebase token');
    return null;
  }

  try {
    console.log(`🖼️ Uploading image for restaurant ${metadata.restaurantId}`);
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(`⚠️ Failed to fetch image from URL: ${response.statusText}`);
      return null;
    }

    const imageBuffer = await response.arrayBuffer();
    const fileName = `${metadata.countyName}/${metadata.townName}/${metadata.restaurantId}/${Date.now()}.jpg`;

    console.log(`📤 Uploading to storage: ${fileName}`);

    const uploadResponse = await fetch('/api/storage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.firebaseToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageData: Buffer.from(imageBuffer).toString('base64'),
        metadata: {
          type: 'restaurant',
          filename: fileName,
          contentType: 'image/jpeg'
        }
      })
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    const { url } = await uploadResponse.json();
    console.log(`✅ Image uploaded successfully: ${url}`);
    return url;
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    return null;
  }
}

// ==================== Main Database Building Function ====================
export async function buildDatabase(
  countyData: CountyData,
  config: BuilderConfig
): Promise<ProcessingStats> {
  const client = new Client({});
  const stats = initializeStats();
  const processedRestaurants = new Set<string>();
  
  for (const town of countyData.towns) {
    let currentQueuedTown = null;
    
    try {
      console.log(`\n📍 Processing town: ${town.name}`);
      
      // Ensure structure exists before processing
      await ensureCountyTownStructure(countyData.name, town.name);

      // Handle cache operations
      if (config.clearCache?.enabled) {
        await clearBuilderCache(town.location.lat, town.location.lng);
      }

      // Check cache first
      const cached = !config.clearCache?.enabled
        ? await getCachedBuildData(
            town.location.lat,
            town.location.lng,
            countyData.name,
            town.name
          )
        : null;

      const maxResults = config.maxResults || 20;

      if (cached?.length) {
        // Process cached restaurants
        for (const cachedRestaurant of cached) {
          if (processedRestaurants.has(cachedRestaurant.id)) continue;
          processedRestaurants.add(cachedRestaurant.id);

          if (processedRestaurants.size > maxResults) break;

          try {
            const restaurantData: RestaurantData = {
              id: cachedRestaurant.id,
              name: cachedRestaurant.name,
              address: cachedRestaurant.address,
              rating: cachedRestaurant.rating || 0,
              location: {
                lat: cachedRestaurant.latitude,
                lng: cachedRestaurant.longitude
              },
              googlePlaceId: cachedRestaurant.id,
              photos: cachedRestaurant.imageUrl ? [cachedRestaurant.imageUrl] : [],
              menuCount: cachedRestaurant.menuCount || 0,
              lastUpdated: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              source: {
                google: cachedRestaurant.hasGoogleData || false,
                yelp: cachedRestaurant.hasYelpData || false
              }
            };

            await saveRestaurantData(
              restaurantData,
              countyData.name,
              town.name,
              true,
              config.incrementalUpdate
            );

            stats.successful++;
            stats.cached++;
          } catch (error) {
            console.error(`Error processing cached restaurant:`, error);
            stats.failed++;
          }
          stats.totalProcessed++;
        }
      }

      // Fetch additional restaurants if needed
      if (processedRestaurants.size < maxResults && !config.checkCacheOnly) {
        let newRestaurants: CachedRestaurant[] = [];
        let pageToken: string | undefined;

        do {
          const response = await client.placesNearby({
            params: {
              location: town.location,
              rankby: PlacesNearbyRanking.distance,
              type: 'restaurant',
              key: config.googleApiKey,
              language: Language.zh_TW,
              ...(pageToken ? { pagetoken: pageToken } : {})
            }
          });

          stats.apiCalls.google++;

          for (const place of response.data.results) {
            if (!isValidPlace(place) || processedRestaurants.has(place.place_id)) {
              continue;
            }

            if (processedRestaurants.size >= maxResults) break;

            const location = getPlaceLocation(place);
            if (!location) continue;

            processedRestaurants.add(place.place_id);

            try {
              const photos = await processPlacePhotos(
                { 
                  place_id: place.place_id, 
                  name: place.name, 
                  photos: place.photos 
                }, 
                config, 
                {
                  countyName: countyData.name,
                  townName: town.name
                }
              );

              const restaurantData: RestaurantData = {
                id: place.place_id,
                name: place.name,
                address: place.vicinity || 'No address available',
                rating: place.rating || 0,
                location: {
                  lat: location.latitude,
                  lng: location.longitude
                },
                googlePlaceId: place.place_id,
                photos,
                menuCount: 0,
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                source: {
                  google: true,
                  yelp: false
                }
              };

              await saveRestaurantData(
                restaurantData,
                countyData.name,
                town.name,
                false,
                config.incrementalUpdate
              );

              newRestaurants.push({
                id: place.place_id,
                name: place.name,
                address: place.vicinity || 'No address available',
                rating: place.rating || 0,
                latitude: location.latitude,
                longitude: location.longitude,
                menuCount: 0,
                county: countyData.name,
                source: 'google',
                hasMenu: false,
                imageUrl: photos[0] || '',
                hasGoogleData: true,
                hasYelpData: false
              });

              stats.successful++;
            } catch (error) {
              console.error(`Error processing place:`, error);
              stats.failed++;
            }
            stats.totalProcessed++;
          }

          pageToken = response.data.next_page_token;
          if (pageToken) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } while (pageToken && processedRestaurants.size < maxResults);

        // Update cache with combined results
        if (newRestaurants.length > 0) {
          const combinedRestaurants = [...(cached || []), ...newRestaurants];
          await saveBuildCache(
            town.location.lat,
            town.location.lng,
            countyData.name,
            town.name,
            combinedRestaurants
          );
        }
      }

      // Verify counts after processing town
      await verifyAndFixRestaurantCount(countyData.name, town.name, true);
      await trackApiUsage('google', stats.apiCalls.google);
await trackApiUsage('yelp', stats.apiCalls.yelp);

    } catch (error) {
      console.error(`Error processing town:`, error);
      stats.failed++;
    }
  }

  // Final verification for all towns
  for (const town of countyData.towns) {
    await verifyAndFixRestaurantCount(countyData.name, town.name, true);
  }

  return stats;
}

function getPlaceLocation(place: any): { latitude: number; longitude: number } | undefined {
  if (place?.geometry?.location) {
    const lat = typeof place.geometry.location.lat === 'function' 
      ? place.geometry.location.lat() 
      : place.geometry.location.lat;
    
    const lng = typeof place.geometry.location.lng === 'function'
      ? place.geometry.location.lng()
      : place.geometry.location.lng;

    if (typeof lat === 'number' && typeof lng === 'number') {
      return {
        latitude: lat,
        longitude: lng
      };
    }
  }
  return undefined;
}

// ==================== Batch Processing Functions ====================
export async function processBatch(
  areas: Array<{
    county: { name: string };
    towns: Array<{
      name: string;
      location: { lat: number; lng: number };
      searchRadiusKm: number;
    }>;
  }>,
  config: BuilderConfig
) {
  const results = [];
  let processedTowns = 0;
  let totalProcessedRestaurants = 0;

  for (const area of areas) {
    for (const town of area.towns) {
      try {
        const result = await buildDatabase(
          {
            name: area.county.name,
            towns: [
              {
                name: town.name,
                location: town.location,
                searchRadiusKm: town.searchRadiusKm
              }
            ]
          },
          config
        );

        processedTowns++;
        totalProcessedRestaurants += result.totalProcessed;

        results.push({
          county: area.county.name,
          town: town.name,
          processed: processedTowns,
          restaurants: totalProcessedRestaurants,
          stats: result
        });
      } catch (error) {
        console.error(`Error processing ${area.county.name} - ${town.name}:`, error);
        results.push({
          county: area.county.name,
          town: town.name,
          processed: processedTowns,
          restaurants: totalProcessedRestaurants,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        if (error instanceof Error && error.message === 'Operation aborted') {
          return results;
        }
      }

      // Add delay between processing
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return results;
}

// Helper to initialize stats
export function initializeStats(): ProcessingStats {
  return {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    cached: 0,
    apiCalls: {
      google: 0,
      yelp: 0
    }
  };
}


