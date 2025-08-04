// Consolidated cache service for maps
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from "@/config/firebaseConfig";
import { CONFIG } from '@/lib/database-builder/config';
import geohash from 'ngeohash';
import type { CacheEntry } from './types';

// Memory cache
const memoryCache = new Map<string, CacheEntry<any>>();

// Helper to check Firestore Timestamp
function isFirestoreTimestamp(value: any): value is Timestamp {
  return value && 
    typeof value === 'object' && 
    'toMillis' in value && 
    typeof value.toMillis === 'function';
}

// Location-specific cache functions
export function getLocationCacheKey(lat: number, lng: number): string {
  // Ensure we're working with numbers
  const latitude = typeof lat === 'number' ? lat : parseFloat(lat);
  const longitude = typeof lng === 'number' ? lng : parseFloat(lng);
  
  // Round to 6 decimal places for consistency
  const roundedLat = Math.round(latitude * 1000000) / 1000000;
  const roundedLng = Math.round(longitude * 1000000) / 1000000;
  
  console.log('Generating cache key for coordinates:', { 
    original: { lat, lng },
    rounded: { lat: roundedLat, lng: roundedLng }
  });
  
  const key = geohash.encode(
    roundedLat, 
    roundedLng, 
    CONFIG.CACHE.GEOHASH.LOCATION_PRECISION
  );
  
  console.log('Generated cache key:', key);
  return key;
}

export function getMetricsCacheKey(lat: number, lng: number): string {
  return geohash.encode(
    lat, 
    lng, 
    CONFIG.CACHE.GEOHASH.METRICS_PRECISION
  );
}

// Make sure the cache collection name is correct
const CACHE_COLLECTION = CONFIG.FIRESTORE.COLLECTIONS.MAPS_CACHE || 'maps_cache';

// Unified cache service
export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryCached = memoryCache.get(key);
    const now = Date.now();
    
    if (memoryCached && now < memoryCached.expiresAt) {
      console.log(`Memory cache hit for ${key}`);
      return memoryCached.data;
    }
    
    // Try Firestore cache
    try {
      const docRef = doc(db, CACHE_COLLECTION, key);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Handle different cache formats
        const cachedData = data.data || data;
        const expiresAt = data.expiresAt || (data.timestamp + (30 * 60 * 1000));
        
        if (now < expiresAt && !data.invalidated) {
          console.log(`Firestore cache hit for ${key}`);
          
          // Update memory cache
          memoryCache.set(key, {
            data: cachedData,
            timestamp: now,
            expiresAt
          });
          
          return cachedData as T;
        }
      }
    } catch (error) {
      console.error('Error reading from Firestore cache:', error);
    }
    
    console.log(`Cache miss for ${key}`);
    return null;
  },
  
  async set<T>(key: string, data: T, ttlMinutes: number = 30): Promise<void> {
    const now = Date.now();
    const expiresAt = now + (ttlMinutes * 60 * 1000);
    
    // Update memory cache
    memoryCache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });
    
    // Update Firestore cache
    try {
      const docRef = doc(db, CACHE_COLLECTION, key);
      await setDoc(docRef, {
        data,
        timestamp: serverTimestamp(),
        expiresAt
      });
    } catch (error) {
      console.error('Error writing to Firestore cache:', error);
    }
  },
  
  async invalidate(key: string): Promise<void> {
    // Remove from memory cache
    memoryCache.delete(key);
    
    // Mark as invalid in Firestore
    try {
      const docRef = doc(db, CACHE_COLLECTION, key);
      await setDoc(docRef, { 
        invalidated: true,
        timestamp: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  },
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
      if (now > entry.expiresAt) {
        memoryCache.delete(key);
      }
    }
  }
};

// Set up periodic cleanup
setInterval(() => cacheService.cleanup(), CONFIG.PROCESSING.VERIFICATION_INTERVAL);

// Add this export to make mapCache available
export const mapCache = {
  async get(key: string) {
    return cacheService.get(key);
  },
  
  async set(key: string, data: any, ttlMinutes?: number) {
    return cacheService.set(key, data, ttlMinutes);
  },
  
  async invalidate(key: string) {
    return cacheService.invalidate(key);
  }
};

// Add this debug function
export function debugLocationCacheKey(lat: number, lng: number): string {
  const key = getLocationCacheKey(lat, lng);
  console.log('Generated cache key for', { lat, lng }, ':', key);
  return key;
} 