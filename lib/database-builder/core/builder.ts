// lib/database-builder/core/builder.ts

import { Client, PlacesNearbyRanking, Language } from '@googlemaps/google-maps-services-js';
import {
  createOrUpdateRestaurant,
  getCachedRestaurantsForLocation,
  type RestaurantDocument
} from '@/app/services/firebaseFirestore';
import { uploadImageToBucket } from '@/app/services/gcpBucketStorage';
import type { CountyData, ProcessingStats } from '../types';
import { clearBuilderCache } from '@/lib/database-builder/cache';

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
}


async function clearCache(lat: number, lng: number) {
  try {
    await clearBuilderCache();
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

// Helper to safely access geometry location
function getPlaceLocation(place: any) {
  if (place?.geometry?.location) {
    return {
      latitude: typeof place.geometry.location.lat === 'function' 
        ? place.geometry.location.lat() 
        : place.geometry.location.lat,
      longitude: typeof place.geometry.location.lng === 'function'
        ? place.geometry.location.lng()
        : place.geometry.location.lng
    };
  }
  return null;
}

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

  console.log(`Starting database build for ${countyData.name}`);

  for (const town of countyData.towns) {
      try {
              // Clear cache if requested
      if (config.clearCache) {
        await clearCache(town.location.lat, town.location.lng);
      }
      // Check cache first
      const cached = await getCachedRestaurantsForLocation(
        town.location.lat,
        town.location.lng
      );


      if (cached) {
        if (config.testMode) {
          console.log(`Cache HIT for ${town.name}: ${cached.length} restaurants`);
        }
        stats.cached += cached.length;
        stats.totalProcessed += cached.length;
        if (config.checkCacheOnly) continue;
      } else if (config.testMode) {
        console.log(`Cache MISS for ${town.name}`);
      }

      // Fetch places from Google Places API
      const response = await client.placesNearby({
        params: {
          location: town.location,
          rankby: PlacesNearbyRanking.distance,
          type: 'restaurant',
          key: config.googleApiKey,
          language: Language.zh_TW // Fix: Use Language enum
        }
      });

      stats.apiCalls.google++;

// Instead of having two nested loops for places, combine them:

// Filter valid places
const validPlaces = response.data.results.filter(place => {
  if (!place.place_id || !place.name) return false;
  const location = getPlaceLocation(place);
  return location !== null;
});

// Limit results if maxResults is set
const limitedPlaces = config.maxResults 
  ? validPlaces.slice(0, config.maxResults) 
  : validPlaces;

// Process each place
for (const place of limitedPlaces) {
  try {
    if (config.testMode) {
      console.log(`Processing place: ${place.name}`);
    }

    const location = getPlaceLocation(place);
    if (!location || !place.place_id) continue;

    // Process photos if available
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

    stats.successful++;
  } catch (error) {
    console.error(`Error processing place ${place.place_id}:`, error);
    stats.failed++;
  }
  stats.totalProcessed++;
}

// Add delay in test mode
if (config.testMode) {
  await new Promise(resolve => setTimeout(resolve, 1000));
}

    } catch (error) {
      console.error(`Error processing town ${town.name}:`, error);
      stats.failed++;
    }
  }

  return stats;
}

// For handling image uploads
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

// Process a batch of areas
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