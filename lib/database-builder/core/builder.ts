import { Client, PlacesNearbyRanking, Language } from '@googlemaps/google-maps-services-js';
import {
  createOrUpdateRestaurant,
  getCachedRestaurantsForLocation,
  type RestaurantDocument
} from '@/app/services/firebaseFirestore';
import { uploadImageToBucket } from '@/app/services/gcpBucketStorage';
import type { CountyData, ProcessingStats } from '../types';
import { clearBuilderCache, getCachedBuildData } from '@/lib/database-builder/cache';

// ==================== Types & Interfaces ====================
export interface BuilderConfig {
  googleApiKey: string;
  yelpApiKey: string;
  projectId: string;
  keyFilename: string;
  firebaseToken?: string;
  clearCache?: boolean;  
  maxResults?: number;  
  testMode?: boolean;   
  checkCacheOnly?: boolean; 
  signal?: AbortSignal; 
}

// ==================== Helper Functions ====================
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
async function uploadRestaurantImage(
  imageUrl: string,
  metadata: {
    restaurantId: string;
    countyName: string;
    townName: string;
  },
  config: BuilderConfig
): Promise<string | null> {
  if (!config.firebaseToken) {
    console.warn('No Firebase token provided, skipping photo upload');
    return null;
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const imageBuffer = await response.arrayBuffer();
    const fileName = `${metadata.countyName}/${metadata.townName}/${metadata.restaurantId}/${Date.now()}.jpg`;

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
      throw new Error('Failed to upload image');
    }

    const { url } = await uploadResponse.json();
    return url;
  } catch (error) {
    console.error('Error uploading image:', error);
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

  const maxResults = config.maxResults || 5;
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
        stats.cached += cached.length;
        stats.totalProcessed += cached.length;

        if (config.checkCacheOnly) {
          console.log('🔎 Check Cache Only mode - skipping API calls');
          continue;
        }
      } else {
        console.log(`⚠️ Cache MISS for ${town.name}`);
      }

      // Test mode delay
      if (config.testMode) {
        console.log(`🔧 Test Mode: Adding delay before processing ${town.name}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Process places if not in cache-only mode
      if (!config.checkCacheOnly) {
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
            const photos = [];
            if (place.photos && place.photos.length > 0) {
              for (const photo of place.photos) {
                const photoUrl = await uploadRestaurantImage(
                  `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${config.googleApiKey}`,
                  {
                    restaurantId: place.place_id,
                    countyName: countyData.name,
                    townName: town.name
                  },
                  config
                );
                if (photoUrl) photos.push(photoUrl);
              }
            }

            // Save to database
            await createOrUpdateRestaurant(place.place_id, {
              name: place.name,
              address: place.vicinity || 'No address available',
              rating: place.rating || 0,
              location,
              county: countyData.name,
              photos,
              menuCount: 0,
              lastUpdated: new Date().toISOString(),
              timestamp: new Date().toISOString(),
              source: {
                google: true,
                yelp: false
              }
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