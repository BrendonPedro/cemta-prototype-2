import { Client, PlacesNearbyRanking, Language } from '@googlemaps/google-maps-services-js';
import {
  createOrUpdateRestaurant,
  getCachedRestaurantsForLocation,
  saveRestaurantData,
  type RestaurantDocument,
} from '@/app/services/firebaseFirestore';
import { uploadImageToBucket } from '@/app/services/gcpBucketStorage';
import type { CountyData, ProcessingStats, PlacePhoto, CachedRestaurant, RestaurantData } from '../types';
import { clearBuilderCache, getCachedBuildData, saveBuildCache } from '@/lib/database-builder/cache';
import { useImageUploader } from '@/lib/database-builder/services/image-handler';
import { processBatchImages, processAndUploadImage } from '@/lib/database-builder/services/image-handler-server';

// ==================== Types & Interfaces ====================
export interface BuilderConfig {
  googleApiKey: string;
  yelpApiKey: string;
  projectId: string;
  keyFilename: string;
  firebaseToken?: string | null;
  clearCache?: boolean;
  maxResults?: number;
  testMode?: boolean;
  checkCacheOnly?: boolean;
    signal?: AbortSignal;
    aborted?: boolean;
}

interface GooglePlacePhoto {
  photo_reference: string;
  width: number;
  height: number;
  html_attributions: string[];
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

async function clearCache(lat: number, lng: number) {
  try {
    await clearBuilderCache();
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
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
  const stats: ProcessingStats = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    cached: 0,
    apiCalls: {
      google: 0,
      yelp: 0
    }
  };

  // Early validation and configuration
  if (!config.firebaseToken) {
    console.warn('⚠️ No Firebase token provided - photos will be skipped');
  }

  const maxResults = config.maxResults || 20;
  console.log(`🚀 Starting database build for ${countyData.name}`);
  console.log('Configuration:', {
    maxResults,
    testMode: config.testMode,
    checkCacheOnly: config.checkCacheOnly
  });

  // Process each town
  for (const town of countyData.towns) {
    try {
      console.log(`\n📍 Processing town: ${town.name}`);
      console.log(`Location: ${town.location.lat}, ${town.location.lng}`);

      // Check for abort signal
      if (config.signal?.aborted) {
        console.log('❌ Operation aborted by user');
        throw new Error('Operation aborted');
      }

      // Handle cache operations
      if (config.clearCache) {
        console.log(`🧹 Clearing cache for ${town.name}`);
        await clearCache(town.location.lat, town.location.lng);
      }

      // Check cache first
      const cached = await getCachedBuildData(
        town.location.lat,
        town.location.lng,
        countyData.name,
        town.name
      );

      if (cached) {
        console.log(`✅ Cache HIT for ${town.name}: Found ${cached.length} restaurants`);

        // Check if cached results are fewer than maxResults
        if (cached.length < maxResults && !config.checkCacheOnly) {
          console.log(`⚠️ Cache has ${cached.length} results but ${maxResults} requested - fetching more...`);

          // Update stats for cached portion
          stats.cached += cached.length;

          // **Process cached restaurants**
          for (const cachedRestaurant of cached) {
            try {
              console.log(`\n🏪 Processing cached restaurant: ${cachedRestaurant.name}`);

              // Create restaurant data object
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

              // Save to database
              await saveRestaurantData(
                restaurantData,
                countyData.name,
                town.name
              );

              console.log(`✅ Successfully processed cached restaurant ${cachedRestaurant.name}`);
              stats.successful++;
            } catch (error) {
              console.error(`❌ Error processing cached restaurant ${cachedRestaurant.name}:`, error);
              stats.failed++;
            }

            stats.totalProcessed++;

            if (config.testMode) {
              console.log('🔧 Test Mode: Adding delay between places');
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          // Proceed with API call for additional results
          console.log(`📡 Fetching additional data from Google Places API for ${town.name}`);

          const response = await client.placesNearby({
            params: {
              location: town.location,
              rankby: PlacesNearbyRanking.distance,
              type: 'restaurant',
              key: config.googleApiKey,
              language: Language.zh_TW
            }
          });

          stats.apiCalls.google++;

          // Process and limit additional places
          const additionalPlaces = processPlaces(
            response.data.results,
            maxResults - cached.length // Only get the additional results needed
          );

          // Collect processed restaurant data
          const additionalCachedRestaurants: CachedRestaurant[] = [];

          // Process new places
          for (const place of additionalPlaces) {
            // Check for abort signal before each place
            if (config.signal?.aborted) {
              console.log('⛔ Processing aborted by user');
              break;
            }

            try {
              console.log(`\n🏪 Processing additional place: ${place.name}`);

              if (config.testMode) {
                console.log('🔧 Test Mode: Detailed place data:', {
                  id: place.place_id,
                  name: place.name,
                  address: place.vicinity,
                  rating: place.rating
                });
              }

              const location = getPlaceLocation(place);
              if (!location || !place.place_id) continue;

              // Process photos
              const photos = await processPlacePhotos(place, config, {
                countyName: countyData.name,
                townName: town.name
              });

              // Save to database
              await saveRestaurantData(
                {
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
                },
                countyData.name,
                town.name
              );

              // Collect cached restaurant data
              additionalCachedRestaurants.push({
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
                hasYelpData: false,
                hasGoogleData: true
              });

              console.log(`✅ Successfully processed additional place ${place.name}`);
              stats.successful++;
            } catch (error) {
              console.error(`❌ Error processing additional place ${place.name}:`, error);
              stats.failed++;
            }

            stats.totalProcessed++;

            if (config.testMode) {
              console.log('🔧 Test Mode: Adding delay between places');
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          // Combine cached and new restaurants
          const combinedRestaurants = [...cached, ...additionalCachedRestaurants];

          // Save combined data back to the cache
          await saveBuildCache(
            town.location.lat,
            town.location.lng,
            countyData.name,
            town.name,
            combinedRestaurants
          );

        } else {
          // We have enough cached results
          stats.cached += cached.length;

          // **Process cached restaurants**
          for (const cachedRestaurant of cached) {
            try {
              console.log(`\n🏪 Processing cached restaurant: ${cachedRestaurant.name}`);

              // Create restaurant data object
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

              // Save to database
              await saveRestaurantData(
                restaurantData,
                countyData.name,
                town.name
              );

              console.log(`✅ Successfully processed cached restaurant ${cachedRestaurant.name}`);
              stats.successful++;
            } catch (error) {
              console.error(`❌ Error processing cached restaurant ${cachedRestaurant.name}:`, error);
              stats.failed++;
            }

            stats.totalProcessed++;

            if (config.testMode) {
              console.log('🔧 Test Mode: Adding delay between places');
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          continue; // Skip to the next town
        }
      } else {
        console.log(`⚠️ Cache MISS for ${town.name}`);

        // Only proceed with API calls if no cache hit
        if (!config.checkCacheOnly) {
          // Test mode delay
          if (config.testMode) {
            console.log(`🔧 Test Mode: Adding delay before processing ${town.name}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          console.log(`📡 Fetching data from Google Places API for ${town.name}`);

          const response = await client.placesNearby({
            params: {
              location: town.location,
              rankby: PlacesNearbyRanking.distance,
              type: 'restaurant',
              key: config.googleApiKey,
              language: Language.zh_TW
            }
          });

          stats.apiCalls.google++;

          // Process and limit places
          const validPlaces = processPlaces(response.data.results, maxResults);

          // Collect processed restaurant data
          const processedCachedRestaurants: CachedRestaurant[] = [];

          // Process each place
          for (const place of validPlaces) {
            // Check for abort signal before each place
            if (config.signal?.aborted) {
              console.log('⛔ Processing aborted by user');
              break;
            }

            try {
              console.log(`\n🏪 Processing place: ${place.name}`);

              if (config.testMode) {
                console.log('🔧 Test Mode: Detailed place data:', {
                  id: place.place_id,
                  name: place.name,
                  address: place.vicinity,
                  rating: place.rating
                });
              }

              const location = getPlaceLocation(place);
              if (!location || !place.place_id) continue;

              // Process photos
              const photos = await processPlacePhotos(place, config, {
                countyName: countyData.name,
                townName: town.name
              });

              // Save to database
              await saveRestaurantData(
                {
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
                },
                countyData.name,
                town.name
              );

              // Collect cached restaurant data
              processedCachedRestaurants.push({
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
                hasYelpData: false,
                hasGoogleData: true
              });

              console.log(`✅ Successfully processed ${place.name}`);
              stats.successful++;
            } catch (error) {
              console.error(`❌ Error processing place ${place.name}:`, error);
              stats.failed++;
            }

            stats.totalProcessed++;

            if (config.testMode) {
              console.log('🔧 Test Mode: Adding delay between places');
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          // Save processed data to the cache
          await saveBuildCache(
            town.location.lat,
            town.location.lng,
            countyData.name,
            town.name,
            processedCachedRestaurants
          );
        }
      }
    } catch (error) {
      console.error(`❌ Error processing town ${town.name}:`, error);
      stats.failed++;

      if (error instanceof Error && error.message === 'Operation aborted') {
        break;
      }
    }
  }

  console.log('\n🏁 Processing complete!');
  console.log('Final Statistics:', {
    totalProcessed: stats.totalProcessed,
    successful: stats.successful,
    failed: stats.failed,
    cached: stats.cached,
    apiCalls: stats.apiCalls
  });

  return stats;
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


