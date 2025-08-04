// Places service
import { Client, PlaceData, PlacesNearbyRanking } from "@googlemaps/google-maps-services-js";
import { cacheService } from '@/app/services/maps/cacheService';
import { CONFIG } from "@/lib/database-builder/config";
import type { RestaurantSearchParams } from './types';

const client = new Client({});

// Comprehensive validation from old service
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

function isCompletePlaceData(place: Partial<PlaceData>): place is PlaceData {
  const requiredFields = [
    'place_id',
    'name',
    'geometry',
    'vicinity'
  ];

  const hasRequiredFields = requiredFields.every(field => 
    place[field as keyof PlaceData] !== undefined
  );

  if (!hasRequiredFields || !place.geometry?.location) {
    return false;
  }

  const location = place.geometry.location;
  if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return false;
  }

  const completedPlace = place as PlaceData;
  
  if (!Array.isArray(completedPlace.address_components)) {
    completedPlace.address_components = [];
  }
  if (!Array.isArray(completedPlace.types)) {
    completedPlace.types = [];
  }
  if (!Array.isArray(completedPlace.photos)) {
    completedPlace.photos = [];
  }

  return (
    typeof completedPlace.place_id === 'string' &&
    typeof completedPlace.name === 'string' &&
    typeof completedPlace.vicinity === 'string' &&
    Array.isArray(completedPlace.address_components) &&
    Array.isArray(completedPlace.types) &&
    completedPlace.geometry !== undefined &&
    typeof completedPlace.geometry.location.lat === 'number' &&
    typeof completedPlace.geometry.location.lng === 'number'
  );
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

    console.log('\n=== Restaurant Search Summary ===');
    console.log(`Starting location: ${latitude}, ${longitude}`);
    console.log(`Search radius: ${radius}m, Max results: ${maxResults}`);

    // Check cache first
    const cacheKey = `places_${latitude.toFixed(6)}_${longitude.toFixed(6)}_${radius}`;
    const cached = await cacheService.get<PlaceData[]>(cacheKey);
    if (cached) {
      console.log(`Found ${cached.length} places in cache`);
      return cached;
    }

    try {
      let allResults: PlaceData[] = [];
      let pageToken: string | undefined;
      let apiCalls = 0;
      const maxRetries = 3;
      
      do {
        if (pageToken) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        try {
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
              .filter(isCompletePlaceData);
            
            console.log(`API Call ${apiCalls}:`);
            console.log(`- Total results: ${response.data.results.length}`);
            console.log(`- Valid restaurants: ${validResults.length}`);
            
            allResults.push(...validResults);
            pageToken = response.data.next_page_token;
            
            console.log(`Cumulative total: ${allResults.length} restaurants`);
          } else if (response.data.status === 'ZERO_RESULTS') {
            console.log('No restaurants found in this area');
            break;
          } else {
            console.warn(`Places API returned status: ${response.data.status}`);
            break;
          }

          if (apiCalls >= CONFIG.SEARCH.PRECISE.MAX_API_CALLS || 
              allResults.length >= maxResults) {
            console.log(`Reached limit: ${apiCalls} API calls, ${allResults.length} results`);
            break;
          }
        } catch (error) {
          console.error('Error fetching from Places API:', error);
          if (apiCalls >= maxRetries) {
            console.log('Max retries reached, stopping API calls');
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } while (pageToken);

      console.log('\nFinal Results:');
      console.log(`- Total API calls made: ${apiCalls}`);
      console.log(`- Restaurants found: ${allResults.length}`);
      console.log('===========================\n');

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
          fields: [
            'name',
            'formatted_address',
            'geometry',
            'photos',
            'place_id',
            'rating',
            'user_ratings_total',
            'formatted_phone_number',
            'international_phone_number',
            'website',
            'opening_hours',
            'price_level',
            'types'
          ]
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
  },
  
  // Export validation functions for external use
  isValidEstablishment,
  isCompletePlaceData
};

// Export for backward compatibility
export const searchNearbyPlaces = placesService.searchNearby; 