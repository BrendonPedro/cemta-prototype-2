// lib/database-builder/places.ts

import { Client, Place as GooglePlace } from "@googlemaps/google-maps-services-js";
import axios from 'axios';
import { create } from 'zustand';
import { CONFIG } from '../config';
import type { ApiError, ProcessingError, Location } from '../types';

// Replace timers/promises setTimeout with a Promise wrapper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Existing type definitions
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

// New Progress Tracking Types
interface FetchProgress {
  googleCallsMade: number;
  yelpCallsMade: number;
  restaurantsProcessed: number;
  totalFound: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentLocation: Location | null;
  error: string | null;
  lastBatchResults: PlaceResult[];
}

interface RateLimiterState extends FetchProgress {
  updateProgress: (progress: Partial<FetchProgress>) => void;
  reset: () => void;
}

// Rate Limiting Store
export const usePlacesFetcher = create<RateLimiterState>((set) => ({
  googleCallsMade: 0,
  yelpCallsMade: 0,
  restaurantsProcessed: 0,
  totalFound: 0,
  status: 'idle',
  currentLocation: null,
  error: null,
  lastBatchResults: [],
  updateProgress: (progress) => set((state) => ({ ...state, ...progress })),
  reset: () => set({
    googleCallsMade: 0,
    yelpCallsMade: 0,
    restaurantsProcessed: 0,
    totalFound: 0,
    status: 'idle',
    currentLocation: null,
    error: null,
    lastBatchResults: []
  })
}));

// Cache implementation
const requestCache = new Map<string, PlaceResult[]>();

// Rate Limited Fetch Options
export interface FetchOptions {
  maxGoogleCalls?: number;
  maxYelpCalls?: number;
  batchSize?: number;
  signal?: AbortSignal;
}

// Rate Limited Places Fetch
export async function fetchPlacesWithLimit(
  client: Client,
  locations: Location[],
  apiKey: string,
  options: FetchOptions = {}
): Promise<PlaceResult[]> {
  const {
    maxGoogleCalls = 50,
    batchSize = 20,
    signal
  } = options;

 const store = usePlacesFetcher.getState();
  const { updateProgress } = store;
  
  updateProgress({ status: 'running' });
  
  const allResults: PlaceResult[] = [];
  
  for (let i = 0; i < locations.length; i += batchSize) {
    if (signal?.aborted) {
      updateProgress({ status: 'paused', error: 'Operation cancelled' });
      return allResults;
    }

    if (store.googleCallsMade >= maxGoogleCalls) {
      updateProgress({ 
        status: 'paused', 
        error: 'Google API call limit reached',
        lastBatchResults: allResults
      });
      return allResults;
    }

     const batchLocations = locations.slice(i, i + batchSize);
    for (const location of batchLocations) {
      try {
        const results = await fetchGooglePlaces(client, location, apiKey);
        allResults.push(...results);
        
        updateProgress({
          googleCallsMade: store.googleCallsMade + 1,
          restaurantsProcessed: allResults.length,
          totalFound: allResults.length,
          currentLocation: location,
          lastBatchResults: results
        });

} catch (error: unknown) {
  handleFetchError(error);
  if ((error as ApiError).response?.status === 429) {
    return allResults;
  }
}

     await delay(CONFIG.API.DELAY_BETWEEN_CALLS);
    }
  }

  updateProgress({ status: 'completed' });
  return allResults;
}

// Original Google Places fetch with updated error handling
export async function fetchGooglePlaces(
  client: Client,
  location: Location,
  apiKey: string,
  retries = CONFIG.API.MAX_RETRIES
): Promise<PlaceResult[]> {
  const cacheKey = `${location.lat},${location.lng}`;
  const cached = requestCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    const response = await client.placesNearby({
      params: {
        location,
        radius: 1000,
        type: 'restaurant',
        key: apiKey,
      },
    });

    const results = response.data.results
      .filter((place): place is GooglePlace & { place_id: string; name: string } => {
        return Boolean(place) &&
               typeof place.place_id === 'string' &&
               typeof place.name === 'string';
      })
      .map(place => ({
        place_id: place.place_id,
        name: place.name,
        geometry: place.geometry ? {
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
        } : undefined,
        vicinity: place.vicinity,
        rating: place.rating,
        photos: place.photos,
        formatted_address: place.formatted_address,
        types: place.types,
        business_status: place.business_status,
        user_ratings_total: place.user_ratings_total,
        price_level: place.price_level
      }));

    requestCache.set(cacheKey, results);
    return results;

  } catch (error) {
    if (retries > 0) {
      await delay(CONFIG.API.RETRY_DELAY);
      return fetchGooglePlaces(client, location, apiKey, retries - 1);
    }
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Failed to fetch places');
  }
}

// Existing Yelp types and fetch function
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
    const apiError = error as ApiError;
    console.error(`Error fetching Yelp data for ${name}:`, apiError.message);
    return null;
  }
}

function handleFetchError(error: ProcessingError | Error | unknown) {
  const store = usePlacesFetcher.getState();
  
  if (error && typeof error === 'object' && 'response' in error) {
    const apiError = error as ApiError;
    if (apiError.response?.status === 429) {
      store.updateProgress({
        status: 'error',
        error: 'Rate limit exceeded'
      });
    }
  } else {
    store.updateProgress({
      status: 'error',
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
}

export function clearCache() {
  requestCache.clear();
}

export function resetProgress() {
  usePlacesFetcher.getState().reset();
}

export type { 
  PlaceResult as Place,
  YelpBusiness,
  PlaceGeometry,
  PlaceLocation,
  PlacePhoto,
  FetchProgress,
  ApiError
};