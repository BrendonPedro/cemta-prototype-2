// Location service
import { Client, Language, AddressType } from "@googlemaps/google-maps-services-js";
import { counties, getNearbyTowns } from '@/lib/data/counties';
import { CONFIG } from '@/lib/database-builder/config';
import { validateTaiwanCoordinates, DEFAULT_CENTER } from '@/config/googleMapsConfig';
import { geocodeService } from '@/app/services/maps/geocodeService';
import { cacheService } from '@/app/services/cacheService';
import type { LocationResult } from '@/app/services/maps/types';
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';

// Utility functions from old service
const normalizeCoordinates = (lat: number, lng: number): LatLngLiteral | null => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const normalizedLat = Number(lat.toFixed(CONFIG.LOCATION.VALIDATION.PRECISION));
  const normalizedLng = Number(lng.toFixed(CONFIG.LOCATION.VALIDATION.PRECISION));

  if (!validateTaiwanCoordinates(normalizedLat, normalizedLng)) {
    return null;
  }

  return { lat: normalizedLat, lng: normalizedLng };
};

const getSearchRadius = (lat: number, lng: number): number => {
  const nearbyTowns = getNearbyTowns(lat, lng, CONFIG.SEARCH.INITIAL_RADIUS);
  return nearbyTowns.length === 0 ? CONFIG.SEARCH.MAX_RADIUS : nearbyTowns[0].searchRadiusKm;
};

const validateCachedLocation = async (
  lat: number,
  lng: number,
  cacheKey: string
): Promise<boolean> => {
  try {
    const cached = await cacheService.get<LocationResult>(cacheKey);
    if (!cached || !cached.coordinates) return false;

    const distance = calculateDistance(
      lat,
      lng,
      cached.coordinates.lat,
      cached.coordinates.lng
    );

    return distance <= CONFIG.SEARCH.PRECISE.RADIUS;
  } catch (error) {
    console.error('Error validating cached location:', error);
    return false;
  }
};

// Export the calculateDistance function directly
export function calculateDistance(
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
}

export const locationService = {
  calculateDistance,

  async determineLocation(lat: number, lng: number): Promise<LocationResult> {
    console.log('\n=== Processing Location Request ===');
    console.log(`Coordinates: ${lat}, ${lng}`);
    
    // 1. Normalize coordinates
    const normalized = normalizeCoordinates(lat, lng);
    if (!normalized) {
      console.warn('Invalid coordinates, using nearest location');
      const nearest = getNearbyTowns(lat, lng, Infinity)[0];
      return {
        county: nearest.countyName,
        townName: nearest.name,
        coordinates: { lat, lng }
      };
    }
    
    // 2. Check cache
    const cacheKey = `location_${normalized.lat.toFixed(6)}_${normalized.lng.toFixed(6)}`;
    const cached = await cacheService.get<LocationResult>(cacheKey);
    
    if (cached) {
      console.log('Found location in cache');
      const isValid = await validateCachedLocation(normalized.lat, normalized.lng, cacheKey);
      
      if (isValid) {
        console.log('Cache is valid, returning cached data');
        return {
          ...cached,
          cached: true
        };
      } else {
        console.log('Cache is invalid, will fetch new data');
      }
    }

    // 3. Check local data
    const searchRadius = getSearchRadius(normalized.lat, normalized.lng);
    const nearbyTowns = getNearbyTowns(normalized.lat, normalized.lng, searchRadius);
    
    if (nearbyTowns.length > 0) {
      const closestTown = nearbyTowns[0];
      console.log('Found location in local data:', {
        town: closestTown.name,
        county: closestTown.countyName,
        distance: Math.round(closestTown.distance * 1000)
      });
      
      const result: LocationResult = {
        county: closestTown.countyName,
        townName: closestTown.name,
        coordinates: normalized
      };

      await cacheService.set(cacheKey, result);
      return result;
    }

    // 4. Use Google Geocoding API as fallback
    console.log('💰 [COST] Making Google Maps Reverse Geocoding API call');
    const geocodeResult = await geocodeService.reverseGeocode(normalized.lat, normalized.lng);
    
    if (geocodeResult) {
      const result: LocationResult = {
        county: geocodeResult.county,
        townName: geocodeResult.townName,
        coordinates: normalized,
        formattedAddress: geocodeResult.formattedAddress,
        placeId: geocodeResult.placeId,
        accuracy: 'GOOGLE_GEOCODING'
      };

      await cacheService.set(cacheKey, result);
      return result;
    }

    // 5. Final fallback
    console.warn('Falling back to nearest known location');
    const nearest = getNearbyTowns(normalized.lat, normalized.lng, Infinity)[0];
    return {
      county: nearest.countyName,
      townName: nearest.name,
      coordinates: normalized
    };
  },
  
  // Export utility functions for external use
  normalizeCoordinates,
  getSearchRadius,
  validateCachedLocation
};

// Add this export at the top level
export const { determineLocation } = locationService; 