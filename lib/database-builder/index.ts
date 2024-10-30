// lib/database-builder/index.ts

import { Storage } from '@google-cloud/storage';
import { Client } from '@googlemaps/google-maps-services-js';
import type { CountyData, ProcessingStats, RestaurantData } from './types';
import { CONFIG } from './config';
import { fetchGooglePlaces, fetchYelpData } from './places';
import { generateGridPoints } from './grid';
import { saveRestaurantData } from './firestore';
import { uploadImageWithRetry } from './storage';
import axios from 'axios';

export async function processCounty(
  countyData: CountyData,
  config: {
    googleApiKey: string;
    yelpApiKey: string;
    projectId: string;
    keyFilename: string;
  }
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
  const storage = new Storage({
    projectId: config.projectId,
    keyFilename: config.keyFilename
  });

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
                  yelpId: yelpData?.id || null,        // Changed from undefined to null
                  yelpRating: yelpData?.rating || null, // Changed from undefined to null
                  priceLevel: null,                     // Initialize optional fields with null
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

            // Process photos if available
            if (place.photos && Array.isArray(place.photos)) {
              for (const photo of place.photos) {
                const photoReference = photo.photo_reference;
                if (!photoReference) continue;

                try {
                  const response = await axios.get(
                    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photoReference}&key=${config.googleApiKey}`,
                    { responseType: 'arraybuffer' }
                  );

                  const imageUrl = await uploadImageWithRetry(
                    storage,
                    Buffer.from(response.data),
                    {
                      countyName: countyData.name,
                      townName: town.name,
                      restaurantId: place.place_id,
                      filename: `${Date.now()}_google.jpg`,
                      contentType: 'image/jpeg',
                      source: 'google'
                    }
                  );

                  if (imageUrl) {
                    restaurantData.photos.push(imageUrl);
                  }
                } catch (photoError) {
                  console.error('Error processing photo:', photoError);
                }
              }
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

export {
  type CountyData,
  type ProcessingStats,
};