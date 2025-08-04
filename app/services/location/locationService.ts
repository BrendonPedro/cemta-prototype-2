import type { LocationResult } from '@/app/services/maps/types';
import type { LocationCache } from '@/app/services/location/type';
import { CONFIG } from '@/lib/database-builder/config';
import { calculateDistance } from '@/app/utils/locationUtils';
import { cacheService } from '../cacheService';

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
