import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from "@/config/firebaseConfig";
import { CONFIG } from '@/lib/database-builder/config';
import geohash from 'ngeohash';

// Types
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  firstCached: number;
}

interface MemoryCache {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T) => Promise<void>;
  cleanup: () => void;
}

const memoryCache = new Map<string, CacheEntry<any>>();

// Helper to check Firestore Timestamp
function isFirestoreTimestamp(value: any): value is Timestamp {
  return value && 
    typeof value === 'object' && 
    'toMillis' in value && 
    typeof value.toMillis === 'function';
}

// Memory cache operations
export const createMemoryCache = (): MemoryCache => {
  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = memoryCache.get(key);
      const now = Date.now();

      if (entry && now - entry.timestamp < CONFIG.CACHE.STRATEGY.MEMORY.TTL) {
        return entry.data;
      }

      if (entry) {
        memoryCache.delete(key);
      }

      return null;
    },

    async set<T>(key: string, value: T): Promise<void> {
      const now = Date.now();
      
      // Enforce max items limit
      if (memoryCache.size >= CONFIG.CACHE.STRATEGY.MEMORY.MAX_ITEMS) {
        const oldestKey = Array.from(memoryCache.entries())
          .reduce((oldest, [key, entry]) => {
            if (!oldest.entry || entry.timestamp < oldest.entry.timestamp) {
              return { key, entry };
            }
            return oldest;
          }, { key: '', entry: null as CacheEntry<any> | null })
          .key;
        
        if (oldestKey) {
          memoryCache.delete(oldestKey);
        }
      }

      memoryCache.set(key, {
        data: value,
        timestamp: now,
        firstCached: now
      });
    },

    cleanup(): void {
      const now = Date.now();
      for (const [key, entry] of memoryCache.entries()) {
        if (now - entry.timestamp > CONFIG.CACHE.STRATEGY.MEMORY.TTL) {
          memoryCache.delete(key);
        }
      }
    }
  };
};

// Firestore cache operations
async function getFromFirestore<T>(key: string, collection: string): Promise<T | null> {
  const docRef = doc(db, collection, key);
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
      } as T;
    }
  }
  return null;
}

async function saveToFirestore<T extends object>(
  key: string, 
  value: T, 
  collection: string
): Promise<void> {
  try {
    const docRef = doc(db, collection, key);
    const now = new Date();
    
    // Get existing document if it exists
    const existingDoc = await getDoc(docRef);
    const firstCachedDate = existingDoc.exists() 
      ? isFirestoreTimestamp(existingDoc.data().firstCached)
        ? existingDoc.data().firstCached.toDate()
        : now
      : now;

    // Clean the data before saving
    const cleanData = Object.entries(value).reduce((acc, [key, val]) => {
      if (val !== undefined) {
        acc[key] = val;
      }
      return acc;
    }, {} as Record<string, any>);

    // Prepare data for Firestore
    const dataToSave = {
      ...cleanData,
      timestamp: serverTimestamp(),
      firstCached: firstCachedDate,
      lastUpdated: serverTimestamp()
    };

    await setDoc(docRef, dataToSave);
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    throw error;
  }
}

// Location-specific cache functions
export function getLocationCacheKey(lat: number, lng: number): string {
  return geohash.encode(
    lat, 
    lng, 
    CONFIG.CACHE.GEOHASH.LOCATION_PRECISION
  );
}

export function getMetricsCacheKey(lat: number, lng: number): string {
  return geohash.encode(
    lat, 
    lng, 
    CONFIG.CACHE.GEOHASH.METRICS_PRECISION
  );
}

// Generic cache service instance
export const cacheService = {
  memory: createMemoryCache(),

  async get<T>(
    key: string,
    collection: string = CONFIG.FIRESTORE.COLLECTIONS.LOCATION_CACHE
  ): Promise<T | null> {
    // Try memory cache first
    const memoryResult = await this.memory.get<T>(key);
    if (memoryResult) {
      console.log(`Memory cache hit for ${key}`);
      return memoryResult;
    }

    // Try Firestore cache
    const firestoreResult = await getFromFirestore<T>(key, collection);
    if (firestoreResult) {
      // Update memory cache
      await this.memory.set(key, firestoreResult);
      console.log(`Firestore cache hit for ${key}`);
      return firestoreResult;
    }

    return null;
  },

  async set<T extends object>(
    key: string,
    value: T,
    collection: string = CONFIG.FIRESTORE.COLLECTIONS.LOCATION_CACHE
  ): Promise<void> {
    // Save to both caches
    await Promise.all([
      this.memory.set(key, value),
      saveToFirestore(key, value, collection)
    ]);
  },

  async invalidate(
    key: string,
    collection: string = CONFIG.FIRESTORE.COLLECTIONS.LOCATION_CACHE
  ): Promise<void> {
    memoryCache.delete(key);
    const docRef = doc(db, collection, key);
    await setDoc(docRef, { 
      invalidated: true,
      lastUpdated: serverTimestamp()
    }, { merge: true });
  },

  cleanup(): void {
    this.memory.cleanup();
  }
};

// Set up periodic cleanup
setInterval(() => cacheService.cleanup(), CONFIG.PROCESSING.VERIFICATION_INTERVAL);

export type { CacheEntry };