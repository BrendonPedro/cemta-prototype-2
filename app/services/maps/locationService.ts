// Location service
import { counties, getNearbyTowns } from '@/lib/data/counties';
import { CONFIG } from '@/lib/database-builder/config';
import { validateTaiwanCoordinates, DEFAULT_CENTER } from '@/config/googleMapsConfig';
import { geocodeService } from '@/app/services/maps/geocodeService';
import { cacheService } from '@/app/services/maps/cacheService';
import type { LocationResult } from '@/app/services/maps/types';
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';

export const locationService = {
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
  
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
    return R * c; // Distance in meters
  },

  async determineLocation(lat: number, lng: number): Promise<LocationResult> {
    // Validate coordinates
    if (!validateTaiwanCoordinates(lat, lng)) {
      console.warn('Invalid coordinates, using nearest location');
      const nearest = getNearbyTowns(lat, lng, Infinity)[0];
      return {
        county: nearest.countyName,
        townName: nearest.name,
        coordinates: { lat, lng }
      };
    }

    // Check cache
    const cacheKey = `location_${lat.toFixed(6)}_${lng.toFixed(6)}`;
    const cached = await cacheService.get<LocationResult>(cacheKey);
    if (cached) {
      return {
        ...cached,
        cached: true
      };
    }

    // Check local data
    const nearbyTowns = getNearbyTowns(lat, lng, CONFIG.SEARCH.INITIAL_RADIUS);
    if (nearbyTowns.length > 0) {
      const closestTown = nearbyTowns[0];
      const result: LocationResult = {
        county: closestTown.countyName,
        townName: closestTown.name,
        coordinates: { lat, lng }
      };

      await cacheService.set(cacheKey, result);
      return result;
    }

    // Use Google Geocoding API as fallback
    const geocodeResult = await geocodeService.reverseGeocode(lat, lng);
    if (geocodeResult) {
      const result: LocationResult = {
        county: geocodeResult.county,
        townName: geocodeResult.townName,
        coordinates: { lat, lng },
        formattedAddress: geocodeResult.formattedAddress,
        placeId: geocodeResult.placeId
      };

      await cacheService.set(cacheKey, result);
      return result;
    }

    // Final fallback
    const nearest = getNearbyTowns(lat, lng, Infinity)[0];
    return {
      county: nearest.countyName,
      townName: nearest.name,
      coordinates: { lat, lng }
    };
  }
}; 