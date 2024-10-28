// app/lib/database-builder/places.ts

import { Client } from "@googlemaps/google-maps-services-js";
import axios from 'axios';
import { setTimeout } from 'timers/promises';
import { CONFIG } from './config';
import type { Location } from './types';

export async function fetchGooglePlaces(
  client: Client,
  location: Location,
  apiKey: string,
  retries = CONFIG.API.MAX_RETRIES
): Promise<google.maps.places.PlaceResult[]> {
  try {
    const response = await client.placesNearby({
      params: {
        location,
        radius: 1000,
        type: 'restaurant',
        key: apiKey
      }
    });
    
    // Type assertion to handle the conversion
    return response.data.results as unknown as google.maps.places.PlaceResult[];
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.API.RETRY_DELAY));
      return fetchGooglePlaces(client, location, apiKey, retries - 1);
    }
    throw error;
  }
}

export async function fetchYelpData(
  name: string,
  location: Location,
  yelpApiKey: string
): Promise<any> {
  try {
    const response = await axios.get(
      'https://api.yelp.com/v3/businesses/search',
      {
        headers: { Authorization: `Bearer ${yelpApiKey}` },
        params: {
          term: name,
          latitude: location.lat,
          longitude: location.lng,
          radius: 100,
          limit: 1
        }
      }
    );
    
    return response.data.businesses[0];
  } catch (error) {
    console.error(`Error fetching Yelp data for ${name}:`, error);
    return null;
  }
}
