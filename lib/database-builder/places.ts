import { Client, Place as GooglePlace } from "@googlemaps/google-maps-services-js";
import axios from 'axios';
import { setTimeout } from 'timers/promises';
import { CONFIG } from './config';
import type { Location } from './types';

// Updated interface to match Google Places API response
interface PlaceLocation {
  lat: number;
  lng: number;
}

interface PlaceViewport {
  northeast: PlaceLocation;
  southwest: PlaceLocation;
}

interface PlaceGeometry {
  location: PlaceLocation;
  viewport?: PlaceViewport;
}

interface PlacePhoto {
  photo_reference: string;
  height: number;
  width: number;
  html_attributions: string[];
}

interface PlaceResult {
  place_id: string;
  name: string;
  geometry?: PlaceGeometry;
  vicinity?: string;
  rating?: number;
  photos?: PlacePhoto[];
  formatted_address?: string;
  types?: string[];
  business_status?: string;
  user_ratings_total?: number;
  price_level?: number;
}

export async function fetchGooglePlaces(
  client: Client,
  location: Location,
  apiKey: string,
  retries = CONFIG.API.MAX_RETRIES
): Promise<PlaceResult[]> {
  try {
    const response = await client.placesNearby({
      params: {
        location,
        radius: 1000,
        type: 'restaurant',
        key: apiKey,
      },
    });

    // Filter and transform results
    const transformedResults: PlaceResult[] = response.data.results
      .filter((place): place is GooglePlace & { place_id: string; name: string } => {
        return Boolean(place) &&
               typeof place.place_id === 'string' &&
               typeof place.name === 'string';
      })
      .map(place => {
        // Transform the geometry to match our expected format
        const geometry = place.geometry ? {
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
          viewport: place.geometry.viewport ? {
            northeast: {
              lat: place.geometry.viewport.northeast.lat,
              lng: place.geometry.viewport.northeast.lng
            },
            southwest: {
              lat: place.geometry.viewport.southwest.lat,
              lng: place.geometry.viewport.southwest.lng
            }
          } : undefined
        } : undefined;

        return {
          place_id: place.place_id,
          name: place.name,
          geometry,
          vicinity: place.vicinity,
          rating: place.rating,
          photos: place.photos,
          formatted_address: place.formatted_address,
          types: place.types,
          business_status: place.business_status,
          user_ratings_total: place.user_ratings_total,
          price_level: place.price_level
        };
      });

    return transformedResults;

  } catch (error) {
    if (retries > 0) {
      await setTimeout(CONFIG.API.RETRY_DELAY);
      return fetchGooglePlaces(client, location, apiKey, retries - 1);
    }
    throw error;
  }
}

// Define Yelp response types
interface YelpBusiness {
  id: string;
  name: string;
  rating?: number;
  photos?: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface YelpSearchResponse {
  businesses: YelpBusiness[];
}

export async function fetchYelpData(
  name: string,
  location: Location,
  yelpApiKey: string
): Promise<YelpBusiness | null> {
  try {
    const response = await axios.get<YelpSearchResponse>(
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
    
    return response.data.businesses[0] || null;
  } catch (error) {
    console.error(`Error fetching Yelp data for ${name}:`, error);
    return null;
  }
}

export type { PlaceResult as Place, YelpBusiness, PlaceGeometry, PlaceLocation, PlacePhoto };