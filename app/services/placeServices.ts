// app/services/placesService.ts

import { Client, PlaceData, PlacesNearbyRanking } from "@googlemaps/google-maps-services-js";
import { CONFIG } from "@/lib/database-builder/config";

const { SEARCH: { PRECISE } } = CONFIG;

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

export async function fetchPreciseLocationResults(
  lat: number,
  lng: number,
  client: Client,
  apiKey: string,
  existingIds: Set<string>
): Promise<{ results: PlaceData[]; apiCalls: number }> {
  let allResults: PlaceData[] = [];
  let pageToken: string | undefined;
  let apiCalls = 0;
  const maxRetries = 3;
  
  console.log('\n=== Restaurant Search Summary ===');
  console.log(`Starting location: ${lat}, ${lng}`);
  console.log(`Existing cached restaurants: ${existingIds.size}`);
  
  do {
    try {
      if (pageToken) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const params = {
        params: {
          location: { lat, lng },
          rankby: PlacesNearbyRanking.distance,
          keyword: 'restaurant|餐廳|food|cafe',
          key: apiKey,
          ...(pageToken ? { pagetoken: pageToken } : {})
        }
      };

      const response = await client.placesNearby(params);
      apiCalls++;

      if (response.data.status === 'OK') {
        const validResults = response.data.results
          .filter(place => isValidEstablishment(place))
          .filter(place => !existingIds.has(place.place_id!))
          .filter(isCompletePlaceData);

        console.log(`API Call ${apiCalls}:`);
        console.log(`- Total results: ${response.data.results.length}`);
        console.log(`- Valid new restaurants: ${validResults.length}`);
        
        allResults.push(...validResults);
        pageToken = response.data.next_page_token;

        console.log(`Cumulative total: ${allResults.length} new restaurants`);
      } else if (response.data.status === 'ZERO_RESULTS') {
        console.log('No new restaurants found in this area');
        break;
      } else {
        console.warn(`Places API returned status: ${response.data.status}`);
        break;
      }

      if (apiCalls >= PRECISE.MAX_API_CALLS || 
          allResults.length >= PRECISE.MAX_RESULTS) {
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
  console.log(`- New restaurants found: ${allResults.length}`);
  console.log(`- Total restaurants (including cached): ${existingIds.size + allResults.length}`);
  console.log('===========================\n');

  return { results: allResults, apiCalls };
}