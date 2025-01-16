import { Client, Language, AddressType } from "@googlemaps/google-maps-services-js";
import { counties, getNearbyTowns } from '@/lib/data/counties';
import { CONFIG } from '@/lib/database-builder/config';
import { mapCache } from "@/app/services/cache/mapCacheService";
import { getLocationCacheKey } from "@/app/services/cacheService";
import { validateTaiwanCoordinates } from "@/config/googleMapsConfig";
import { calculateDistance } from '@/app/utils/locationUtils';
import type { LocationDetails, Coordinates, LocationResponse } from '@/app/services/location/type';

// Utility functions
const normalizeCoordinates = (lat: number, lng: number): Coordinates | null => {
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
    const cached = await mapCache.get(cacheKey);
    if (!cached) return false;

    const distance = calculateDistance(
      lat,
      lng,
      cached.latitude,
      cached.longitude
    );

    return distance <= CONFIG.SEARCH.PRECISE.RADIUS;
  } catch (error) {
    console.error('Error validating cached location:', error);
    return false;
  }
};

const saveLocationToCache = async (
  lat: number, 
  lng: number, 
  location: LocationResponse
): Promise<void> => {
  const cacheKey = getLocationCacheKey(lat, lng);
  try {
    const existing = await mapCache.get(cacheKey);
    const now = Date.now();

    await mapCache.set(cacheKey, {
      ...location,
      latitude: lat,
      longitude: lng,
      geohash: cacheKey,
      firstCached: existing?.firstCached || now,
      lastAccessed: now,
      timestamp: now,
      expiresAt: now + CONFIG.CACHE.DURATION,
      restaurants: []  // Initialize empty restaurants array required by MapCacheEntry
    });
  } catch (error) {
    console.error('Failed to cache location:', error);
  }
};

// Core location function
export async function determineLocation(lat: number, lng: number): Promise<LocationResponse> {
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
  const cacheKey = getLocationCacheKey(normalized.lat, normalized.lng);
  const isValidCache = await validateCachedLocation(normalized.lat, normalized.lng, cacheKey);

  if (isValidCache) {
    const cached = await mapCache.get(cacheKey);
    if (cached?.county && cached?.townName) {
      console.log('💰 Cache hit for location');
      return {
        county: cached.county,
        townName: cached.townName,
        coordinates: normalized,
        formattedAddress: cached.formattedAddress,
        placeId: cached.placeId,
        accuracy: cached.accuracy,
        cached: true
      };
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

    const result: LocationResponse = {
      county: closestTown.countyName,
      townName: closestTown.name,
      coordinates: normalized
    };

    await saveLocationToCache(normalized.lat, normalized.lng, result);
    return result;
  }

  // 4. Use Google Geocoding API
  try {
    console.log('💰 [COST] Making Google Maps Reverse Geocoding API call');
    const client = new Client({});
    const response = await client.reverseGeocode({
      params: {
        latlng: normalized,
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
      )?.long_name;

      let town = components?.find(c => 
        c.types.includes(AddressType.locality) ||
        c.types.includes(AddressType.sublocality_level_1)
      )?.long_name;

      if (county && town) {
        const locationResult: LocationResponse = {
          county,
          townName: town,
          coordinates: normalized,
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
          accuracy: result.geometry.location_type
        };

        await saveLocationToCache(normalized.lat, normalized.lng, locationResult);
        return locationResult;
      }
    }
  } catch (error) {
    console.error('Error in Google Geocoding:', error);
  }

  // 5. Fallback to nearest known location
  console.warn('Falling back to nearest known location');
  const nearest = getNearbyTowns(normalized.lat, normalized.lng, Infinity)[0];
  return {
    county: nearest.countyName,
    townName: nearest.name,
    coordinates: normalized
  };
}