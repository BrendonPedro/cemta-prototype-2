// Geocoding service
import { Client, Language, AddressType } from "@googlemaps/google-maps-services-js";
import { cacheService } from '@/app/services/maps/cacheService';
import { validateTaiwanCoordinates } from '@/config/googleMapsConfig';
import type { GeocodeResult, ReverseGeocodeResult } from '@/app/services/maps/types';

const client = new Client({});

export const geocodeService = {
  async geocode(address: string): Promise<GeocodeResult | null> {
    // Check cache first
    const cacheKey = `geocode_${address}`;
    const cached = await cacheService.get<GeocodeResult>(cacheKey);
    if (cached) return cached;

    try {
      const response = await client.geocode({
        params: {
          address,
          key: process.env.GOOGLE_MAPS_API_KEY!,
          language: Language.en,
        },
      });

      if (response.data.results?.length) {
        const result = response.data.results[0];
        const geocodeResult: GeocodeResult = {
          location: result.geometry.location,
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
        };

        // Cache the result
        await cacheService.set(cacheKey, geocodeResult);
        return geocodeResult;
      }
      return null;
    } catch (error) {
      console.error('Error in geocode:', error);
      return null;
    }
  },

  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
    if (!validateTaiwanCoordinates(lat, lng)) {
      console.warn('Location outside Taiwan bounds');
      return null;
    }

    // Check cache first
    const cacheKey = `reverse_${lat.toFixed(6)}_${lng.toFixed(6)}`;
    const cached = await cacheService.get<ReverseGeocodeResult>(cacheKey);
    if (cached) return cached;

    try {
      const response = await client.reverseGeocode({
        params: {
          latlng: { lat, lng },
          key: process.env.GOOGLE_MAPS_API_KEY!,
          language: Language.en,
          result_type: [
            AddressType.administrative_area_level_2,
            AddressType.locality,
            AddressType.sublocality_level_1
          ]
        },
      });

      if (response.data.results?.length) {
        const result = response.data.results[0];
        const components = result.address_components;

        let county = components?.find(c => 
          c.types.includes(AddressType.administrative_area_level_2)
        )?.long_name || '';

        let town = components?.find(c => 
          c.types.includes(AddressType.locality) ||
          c.types.includes(AddressType.sublocality_level_1)
        )?.long_name || '';

        // Build address components object
        const addressComponents: {[key: string]: string} = {};
        components?.forEach(component => {
          component.types.forEach(type => {
            addressComponents[type] = component.long_name;
          });
        });

        const reverseGeocodeResult: ReverseGeocodeResult = {
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
          county,
          townName: town,
          addressComponents
        };

        // Cache the result
        await cacheService.set(cacheKey, reverseGeocodeResult);
        return reverseGeocodeResult;
      }
      return null;
    } catch (error) {
      console.error('Error in reverseGeocode:', error);
      return null;
    }
  }
}; 