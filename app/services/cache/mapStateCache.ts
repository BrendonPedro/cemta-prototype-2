// app/services/cache/mapStateCache.ts
import { CONFIG } from '@/lib/database-builder/config';
import { cacheService } from '@/app/services/cacheService';
import type { MapState } from '@/app/services/location/type';
import { DEFAULT_CENTER } from '@/config/googleMapsConfig';

interface MemoryMapState {
  data: MapState;
  timestamp: number;
}

const memoryStateCache = new Map<string, MemoryMapState>();

export const mapStateCache = {
  async get(key: string): Promise<MapState | null> {
    const memoryCacheEntry = memoryStateCache.get(key);
    const now = Date.now();

    if (memoryCacheEntry && now - memoryCacheEntry.timestamp < CONFIG.CACHE.STRATEGY.MEMORY.TTL) {
      return memoryCacheEntry.data;
    }

    const data = await cacheService.get<MapState>(
      key, 
      CONFIG.FIRESTORE.COLLECTIONS.MAP_STATES
    );

    if (data) {
      memoryStateCache.set(key, {
        data,
        timestamp: now
      });
      return data;
    }

    return null;
  },

  async set(key: string, value: Partial<MapState>): Promise<void> {
    const now = new Date();
    const normalizedValue: MapState = {
      center: value.center || DEFAULT_CENTER,
      zoom: value.zoom || 14,
      timestamp: now
    };

    memoryStateCache.set(key, {
      data: normalizedValue,
      timestamp: now.getTime()
    });

    await cacheService.set(
      key, 
      normalizedValue, 
      CONFIG.FIRESTORE.COLLECTIONS.MAP_STATES
    );
  },

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of memoryStateCache.entries()) {
      if (now - entry.timestamp > CONFIG.CACHE.STRATEGY.MEMORY.TTL) {
        memoryStateCache.delete(key);
      }
    }
  }
};

// Set up periodic cleanup
setInterval(
  () => mapStateCache.cleanup(), 
  CONFIG.PROCESSING.VERIFICATION_INTERVAL
);