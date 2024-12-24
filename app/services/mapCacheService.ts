// app/services/mapCacheService.ts

import { CONFIG } from '@/lib/database-builder/config';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from "@/config/firebaseConfig";
import geohash from 'ngeohash';

interface CacheEntry {
  data: any;
  timestamp: number;
  firstCached: number;
}

// Add helper function to check for Firestore Timestamp
function isFirestoreTimestamp(value: any): value is Timestamp {
  return value && 
    typeof value === 'object' && 
    'toMillis' in value && 
    typeof value.toMillis === 'function';
}

// Helper functions
async function getFromFirestore(key: string) {
  const docRef = doc(db, CONFIG.CACHE.STRATEGY.FIRESTORE.COLLECTIONS.LOCATIONS, key);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    const now = Date.now();
    const firstCachedTimestamp = isFirestoreTimestamp(data.firstCached)
    ? data.firstCached.toMillis()
    : typeof data.firstCached === 'number' 
      ? data.firstCached 
      : now;

  if (now - firstCachedTimestamp < CONFIG.CACHE.DURATION) {
    return {
      ...data,
      firstCached: firstCachedTimestamp
    };
  }
}
return null;
}

async function saveToFirestore(key: string, value: any) {
  try {
    const docRef = doc(db, CONFIG.CACHE.STRATEGY.FIRESTORE.COLLECTIONS.LOCATIONS, key);
    const now = new Date();
    
    // Get existing document if it exists
    const existingDoc = await getDoc(docRef);
    const firstCachedDate = existingDoc.exists() 
      ? isFirestoreTimestamp(existingDoc.data().firstCached)
        ? existingDoc.data().firstCached.toDate()
        : now
      : now;

    // Clean and validate the data before saving
    const cleanRestaurants = value.restaurants?.map((restaurant: any) => {
      // Remove any undefined values
      const cleaned = Object.entries(restaurant).reduce((acc, [key, val]) => {
        if (val !== undefined) {
          acc[key] = val;
        }
        return acc;
      }, {} as any);

      return {
        ...cleaned,
        createdAt: cleaned.createdAt || now.toISOString(),
        lastUpdated: now.toISOString()
      };
    }) || [];

    // Ensure all required fields are present and not undefined
    const dataToSave = {
      restaurants: cleanRestaurants,
      latitude: value.latitude || value.lat,
      longitude: value.longitude || value.lng,
      timestamp: serverTimestamp(),
      firstCached: firstCachedDate,
      geohash: geohash.encode(
        value.latitude || value.lat,
        value.longitude || value.lng,
        CONFIG.CACHE.GEOHASH.LOCATION_PRECISION
      ),
      lastUpdated: serverTimestamp()
    };

    // Remove any undefined values from the root object
    const cleanData = Object.entries(dataToSave).reduce((acc, [key, val]) => {
      if (val !== undefined) {
        acc[key] = val;
      }
      return acc;
    }, {} as any);

    await setDoc(docRef, cleanData);
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    throw error;
  }
}

export function createMapCache() {
  const cache = new Map<string, CacheEntry>();

  return {
    async get(key: string) {
      const memoryCache = cache.get(key);
      const now = Date.now();

      if (memoryCache && now - memoryCache.timestamp < CONFIG.CACHE.STRATEGY.MEMORY.TTL) {
        console.log(`Memory cache hit for ${key}`);
        return memoryCache.data;
      }

      const data = await getFromFirestore(key);
      if (data) {
        cache.set(key, {
          data,
          timestamp: now,
          firstCached: isFirestoreTimestamp(data.firstCached)
            ? data.firstCached.toMillis() 
            : now
        });
        console.log(`Firestore cache hit for ${key}`);
      }
      return data;
    },

    async set(key: string, data: any) {
      const now = Date.now();
      cache.set(key, {
        data,
        timestamp: now,
        firstCached: now
      });

      await saveToFirestore(key, data);
    },

    cleanup() {
      const now = Date.now();
      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > CONFIG.CACHE.STRATEGY.MEMORY.TTL) {
          cache.delete(key);
        }
      }
    }
  };
}

// Create singleton instance
export const mapCache = createMapCache();

// Set up periodic cleanup
setInterval(() => mapCache.cleanup(), CONFIG.PROCESSING.VERIFICATION_INTERVAL);