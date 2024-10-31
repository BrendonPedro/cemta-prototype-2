// lib/database-builder/index.ts

import { Client } from '@googlemaps/google-maps-services-js';
import type { CountyData, ProcessingStats, RestaurantData, PlacePhoto } from './types';
import { CONFIG } from './config';
import { generateGridPoints } from './grid';
import { saveRestaurantData } from './firestore';
import axios from 'axios';
import { 
  fetchGooglePlaces, 
  fetchYelpData,
  fetchPlacesWithLimit,
  usePlacesFetcher,
  clearCache,
  resetProgress
} from './services/places';

async function processPhoto(
  photo: PlacePhoto,
  config: {
    googleApiKey: string;
    firebaseToken?: string;
    metadata: {
      countyName: string;
      townName: string;
      restaurantId: string;
    };
  }
): Promise<string | null> {
  if (!photo.photo_reference) return null;

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${config.googleApiKey}`,
      { responseType: 'arraybuffer' }
    );

    if (!config.firebaseToken) {
      console.warn('No Firebase token provided, skipping photo upload');
      return null;
    }

    const formData = new FormData();
    formData.append('imageData', Buffer.from(response.data).toString('base64'));
    formData.append('metadata', JSON.stringify({
      type: 'restaurant',
      source: 'google',
      countyName: config.metadata.countyName,
      townName: config.metadata.townName,
      restaurantId: config.metadata.restaurantId,
      filename: `${Date.now()}_google.jpg`,
      contentType: 'image/jpeg'
    }));

    const uploadResponse = await fetch('/api/storage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.firebaseToken}`,
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status: ${uploadResponse.status}`);
    }

    const { url } = await uploadResponse.json();
    return url || null;

  } catch (error) {
    console.error('Error processing photo:', error);
    return null;
  }
}

export async function processCounty(
  countyData: CountyData,
  config: {
    googleApiKey: string;
    yelpApiKey: string;
    projectId: string;
    keyFilename: string;
  },
  firebaseToken?: string
): Promise<ProcessingStats> {
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

  const client = new Client({});

  for (const town of countyData.towns) {
    try {
      const gridPoints = generateGridPoints(town.location, town.searchRadiusKm);
      
      for (const point of gridPoints) {
        const places = await fetchGooglePlaces(client, point, config.googleApiKey);
        stats.apiCalls.google++;

        for (const place of places) {
          if (!place.place_id || !place.name || !place.geometry?.location) {
            console.warn('Skipping place due to missing required data');
            continue;
          }

          try {
            const location = {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng
            };

            const yelpData = await fetchYelpData(
              place.name,
              location,
              config.yelpApiKey
            );
            stats.apiCalls.yelp++;

            const restaurantData: RestaurantData = {
              id: place.place_id,
              name: place.name,
              address: place.vicinity || 'Address not available',
              location,
              rating: place.rating || 0,
              googlePlaceId: place.place_id,
              yelpId: yelpData?.id || null,
              yelpRating: yelpData?.rating || null,
              priceLevel: null,
              phone: null,
              website: null,
              photos: [],
              menuCount: 0,
              lastUpdated: new Date().toISOString(),
              source: {
                google: true,
                yelp: !!yelpData
              }
            };

            if (place.photos && Array.isArray(place.photos)) {
              const photoUrls = await Promise.all(
                place.photos.map(photo => 
                  processPhoto(photo, {
                    googleApiKey: config.googleApiKey,
                    firebaseToken,
                    metadata: {
                      countyName: countyData.name,
                      townName: town.name,
                      restaurantId: place.place_id,
                    }
                  })
                )
              );

              restaurantData.photos = photoUrls.filter((url): url is string => url !== null);
            }

            await saveRestaurantData(restaurantData, countyData.name, town.name);
            stats.successful++;
            stats.totalProcessed++;

            await new Promise(resolve => setTimeout(resolve, CONFIG.API.DELAY_BETWEEN_CALLS));
          } catch (error) {
            console.error(`Error processing place ${place.place_id}:`, error);
            stats.failed++;
          }
        }
      }
    } catch (error) {
      console.error(`Error processing town ${town.name}:`, error);
      stats.failed++;
    }
  }

  return stats;
}

// Export components
export { generateGridPoints } from './grid';
export { PlacesMonitor } from './components/PlacesMonitor';

// Export types
export type {
  CountyData,
  ProcessingStats,
  FetchProgress,
  Place,
  YelpBusiness,
  RestaurantData,
} from './types';

// Export functions
export {
  fetchPlacesWithLimit,
  fetchGooglePlaces,
  fetchYelpData,
  clearCache,
  resetProgress,
  usePlacesFetcher,
};