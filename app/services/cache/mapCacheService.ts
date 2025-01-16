import { CONFIG } from '@/lib/database-builder/config';
import { cacheService } from '../cacheService';
import type { CachedRestaurant } from '@/app/services/restaurant/types';
import type { 
  LocationDetails, 
  LocationResponse,
  CacheTimestamps,
  Coordinates 
} from '@/app/services/location/type';

export interface MapCacheEntry extends LocationResponse, CacheTimestamps {
  restaurants: CachedRestaurant[];
  latitude: number;
  longitude: number;
  geohash: string;
}

export interface MemoryMapCache {
  data: MapCacheEntry;
  timestamp: number;
  firstCached: number;
}

export function getTimestamps(now = Date.now()): CacheTimestamps {
  return {
    timestamp: now,
    firstCached: now,
    lastAccessed: now,
    expiresAt: now + CONFIG.CACHE.DURATION
  };
}

export const memoryMapCache = new Map<string, MemoryMapCache>();

export const mapCache = {
  async get(key: string): Promise<MapCacheEntry | null> {
    const memoryCacheEntry = memoryMapCache.get(key);
    const now = Date.now();

    if (memoryCacheEntry && now - memoryCacheEntry.timestamp < CONFIG.CACHE.STRATEGY.MEMORY.TTL) {
      return memoryCacheEntry.data;
    }

    const data = await cacheService.get<MapCacheEntry>(
      key, 
      CONFIG.FIRESTORE.COLLECTIONS.LOCATION_CACHE
    );

    if (data) {
      const normalizedData = {
        ...data,
        ...getTimestamps(now)
      };

      memoryMapCache.set(key, {
        data: normalizedData,
        timestamp: now,
        firstCached: normalizedData.firstCached
      });

      return normalizedData;
    }

    return null;
  },

  async set(
    key: string, 
    value: Partial<MapCacheEntry> & LocationResponse
  ): Promise<void> {
    const now = Date.now();
    const timestamps = getTimestamps(now);

    const normalizedValue: MapCacheEntry = {
      ...value,
      ...timestamps,
      restaurants: value.restaurants || [],
      latitude: value.coordinates.lat,
      longitude: value.coordinates.lng,
      geohash: value.geohash || key
    };

    memoryMapCache.set(key, {
      data: normalizedValue,
      timestamp: now,
      firstCached: timestamps.firstCached
    });

    await cacheService.set(
      key, 
      normalizedValue, 
      CONFIG.FIRESTORE.COLLECTIONS.LOCATION_CACHE
    );
  },

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of memoryMapCache.entries()) {
      if (now - entry.timestamp > CONFIG.CACHE.STRATEGY.MEMORY.TTL) {
        memoryMapCache.delete(key);
      }
    }
  }
};

// Set up periodic cleanup
setInterval(
  () => mapCache.cleanup(), 
  CONFIG.PROCESSING.VERIFICATION_INTERVAL
);