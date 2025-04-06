// Places service
import { Client, PlaceData, PlacesNearbyRanking } from "@googlemaps/google-maps-services-js";
import { cacheService } from '@/app/services/maps/cacheService';
import { CONFIG } from "@/lib/database-builder/config";
import type { RestaurantSearchParams } from './types';

const client = new Client({});

function isValidEstablishment(place: Partial<PlaceData>): boolean {
  const validTypes = [
    'restaurant', 'food', 'meal_takeaway', 'cafe',
    'meal_delivery', 'bakery', 'bar', 'establishment',
    'point_of_interest'
  ];

  return place.types?.some(type => 
    validTypes.includes(type.toLowerCase())
  ) ?? false;
}

export const placesService = {
  async searchNearby(params: RestaurantSearchParams) {
    const { 
      latitude, 
      longitude, 
      radius = CONFIG.SEARCH.INITIAL_RADIUS,
      keyword = 'restaurant|餐廳|food|cafe',
      maxResults = CONFIG.SEARCH.PRECISE.MAX_RESULTS
    } = params;

    // Check cache first
    const cacheKey = `places_${latitude.toFixed(6)}_${longitude.toFixed(6)}_${radius}`;
    const cached = await cacheService.get<PlaceData[]>(cacheKey);
    if (cached) return cached;

    try {
      let allResults: PlaceData[] = [];
      let pageToken: string | undefined;
      let apiCalls = 0;
      
      do {
        if (pageToken) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const response = await client.placesNearby({
          params: {
            location: { lat: latitude, lng: longitude },
            radius: radius,
            keyword,
            key: process.env.GOOGLE_MAPS_API_KEY!,
            ...(pageToken ? { pagetoken: pageToken } : {})
          }
        });

        apiCalls++;

        if (response.data.status === 'OK') {
          const validResults = response.data.results
            .filter(place => isValidEstablishment(place))
            .map(place => {
              // Ensure all required properties are present
              return {
                ...place,
                address_components: place.address_components || []
              } as PlaceData;
            });
          
          allResults.push(...validResults);
          pageToken = response.data.next_page_token;
        } else if (response.data.status !== 'ZERO_RESULTS') {
          console.warn(`Places API returned status: ${response.data.status}`);
          break;
        }

        if (apiCalls >= CONFIG.SEARCH.PRECISE.MAX_API_CALLS || 
            allResults.length >= maxResults) {
          break;
        }
      } while (pageToken);

      // Cache the results
      await cacheService.set(cacheKey, allResults);
      return allResults;
    } catch (error) {
      console.error('Error fetching from Places API:', error);
      return [];
    }
  },

  async getPlaceDetails(placeId: string) {
    // Check cache first
    const cacheKey = `place_${placeId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await client.placeDetails({
        params: {
          place_id: placeId,
          key: process.env.GOOGLE_MAPS_API_KEY!,
        },
      });

      if (response.data.status === 'OK') {
        // Cache the result
        await cacheService.set(cacheKey, response.data.result);
        return response.data.result;
      }
      return null;
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  }
};

export const searchNearbyPlaces = placesService.searchNearby; 