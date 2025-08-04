import { CONFIG } from '@/lib/database-builder/config';
import type { CachedRestaurant } from '@/app/services/restaurant/types';
import type { LocationResult } from '@/app/services/maps/types';

// In-memory cache for map data
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Define the structure for location cache entries
export interface LocationCacheEntry {
  restaurants: CachedRestaurant[];
  latitude: number;
  longitude: number;
  county: string;
  townName: string;
  firstCached: number;
  lastAccessed: number;
  expiresAt: number;
  geohash?: string;
}

class MapCache {
  private cache = new Map<string, CacheEntry<any>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    const now = Date.now();
    
    if (entry && now < entry.expiresAt) {
      return entry.data as T;
    }
    
    return null;
  }

  async set<T>(key: string, data: T, ttl: number = CACHE_EXPIRY): Promise<void> {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async getRestaurantsForLocation(lat: number, lng: number): Promise<CachedRestaurant[]> {
    const key = `restaurants_${lat.toFixed(6)}_${lng.toFixed(6)}`;
    const result = await this.get<LocationCacheEntry>(key);
    return result?.restaurants || [];
  }

  async saveRestaurantsForLocation(
    lat: number, 
    lng: number, 
    restaurants: CachedRestaurant[],
    county: string = '',
    townName: string = ''
  ): Promise<void> {
    const key = `restaurants_${lat.toFixed(6)}_${lng.toFixed(6)}`;
    const now = Date.now();
    const existing = await this.get<LocationCacheEntry>(key) || {
      restaurants: [],
      latitude: lat,
      longitude: lng,
      county: '',
      townName: '',
      firstCached: now,
      lastAccessed: now,
      expiresAt: now + CACHE_EXPIRY
    };
    
    const updated: LocationCacheEntry = {
      ...existing,
      restaurants,
      county: county || existing.county,
      townName: townName || existing.townName,
      lastAccessed: now,
      expiresAt: now + CACHE_EXPIRY
    };
    
    await this.set(key, updated);
  }

  async getLocationDetails(lat: number, lng: number): Promise<LocationResult | null> {
    const key = `location_${lat.toFixed(6)}_${lng.toFixed(6)}`;
    return await this.get<LocationResult>(key);
  }

  async saveLocationDetails(lat: number, lng: number, details: LocationResult): Promise<void> {
    const key = `location_${lat.toFixed(6)}_${lng.toFixed(6)}`;
    await this.set(key, details);
  }
}

// Singleton instance
export const mapCache = new MapCache(); 