// lib/database-builder/cache.ts

import { db } from '@/config/firebaseConfig';
import { 
  doc, 
getDocs, 
  getDoc,
  setDoc, 
  collection, 
  query, 
    where,
    deleteDoc,
    increment, 
} from 'firebase/firestore';
import type { CachedRestaurant } from '@/app/services/firebaseFirestore';
import geohash from 'ngeohash';
import { CONFIG } from './config';

export interface CacheMetrics {
  id?: string;
  hits: number;
  misses: number;
  lastAccessed: Date;
  lastUpdated: Date;
  restaurants: number;
  accessCount?: number;
  expired?: number;
  expirationDate?: Date;
}

interface BuilderCache {
  countyName: string;
  townName: string;
  geohash: string;
  timestamp: number;
  restaurants: CachedRestaurant[];
  lastUpdated: {
    restaurants: number;
    images: number;
  };
}

interface FirestoreTimestamp {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}

interface CacheMetricsFirestore extends Omit<CacheMetrics, 'lastAccessed' | 'lastUpdated' | 'expirationDate'> {
  lastAccessed: FirestoreTimestamp;
  lastUpdated: FirestoreTimestamp;
  expirationDate?: FirestoreTimestamp;
}

// Add this helper function
function isFirestoreTimestamp(value: any): value is FirestoreTimestamp {
  return value && typeof value.toDate === 'function' && 
         typeof value.seconds === 'number' && 
         typeof value.nanoseconds === 'number';
}

// Add this function to cleanup expired cache entries
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const now = Date.now();
    const snapshot = await getDocs(collection(db, BUILDER_CACHE_CONFIG.COLLECTION));
    
    const expiredDocs = snapshot.docs.filter(doc => {
      const data = doc.data() as BuilderCache;
      return now - data.timestamp > BUILDER_CACHE_CONFIG.DURATION;
    });

    await Promise.all(expiredDocs.map(doc => deleteDoc(doc.ref)));
    
    console.log(`🧹 Cleaned up ${expiredDocs.length} expired cache entries`);
    return expiredDocs.length;
  } catch (error) {
    console.error('Error cleaning up expired cache:', error);
    return 0;
  }
}

const BUILDER_CACHE_CONFIG = {
  COLLECTION: 'databaseBuilderCache',
  DURATION: 365 * 24 * 60 * 60 * 1000, // 365 days
  GEOHASH_PRECISION: 6
};

function getBuilderCacheKey(lat: number, lng: number, countyName: string, townName: string): string {
  const locationHash = geohash.encode(lat, lng, BUILDER_CACHE_CONFIG.GEOHASH_PRECISION);
  return `${countyName.toLowerCase()}_${townName.toLowerCase()}_${locationHash}`;
}

export async function getCachedBuildData(
  lat: number,
  lng: number,
  countyName: string,
  townName: string
): Promise<CachedRestaurant[] | null> {
  const cacheKey = getBuilderCacheKey(lat, lng, countyName, townName);
  const cacheRef = doc(db, BUILDER_CACHE_CONFIG.COLLECTION, cacheKey);
  const metricsRef = doc(db, 'cacheMetrics', cacheKey); // cache metrics tracking

  console.log(`🔍 Checking cache for key: ${cacheKey}`);
  
  
  try {
    const docSnap = await getDoc(cacheRef);
    const now = Date.now();

        // Update metrics
    const metricsUpdate = {
      lastAccessed: new Date(),
      location: { lat, lng },
      county: countyName,
      town: townName
    };

  if (docSnap.exists()) {
      const data = docSnap.data() as BuilderCache;
      const cacheTime = data.timestamp;
      const age = now - cacheTime;
    const isValid = age < BUILDER_CACHE_CONFIG.DURATION;
    
      console.log(`📊 Cache entry found:`, {
        age: `${Math.round(age / (1000 * 60 * 60))} hours`,
        restaurants: data.restaurants.length,
        isValid
      });
    
    
     if (isValid) {
        await setDoc(metricsRef, {
          ...metricsUpdate,
          hits: increment(1),
          restaurants: data.restaurants.length,
          lastUpdated: new Date()
        }, { merge: true });
        return data.restaurants;
      } else {
        await setDoc(metricsRef, {
          ...metricsUpdate,
          expired: increment(1),
          expirationDate: new Date()
        }, { merge: true });
        console.log(`⚠️ Cache expired (${Math.round(age / (1000 * 60 * 60))} hours old)`);
      }
    } else {
      // Record cache miss
      await setDoc(metricsRef, {
        ...metricsUpdate,
        misses: increment(1),
        lastUpdated: new Date()
      }, { merge: true });
      console.log('❌ No cache entry found');
    }

    return null;
  } catch (error) {
    console.error('❌ Error accessing cache:', error);
    return null;
  }
}

// Add a function to get cache metrics
export async function getCacheMetrics(
  countyName?: string,
  townName?: string
): Promise<CacheMetrics[]> {
  try {
    // Start with the base collection
    let baseQuery = collection(db, 'cacheMetrics');
    
    // Build the query
    let constraints = [];
    if (countyName) {
      constraints.push(where('county', '==', countyName));
    }
    if (townName) {
      constraints.push(where('town', '==', townName));
    }

    // Apply the query with constraints
    const q = constraints.length > 0 
      ? query(baseQuery, ...constraints)
      : baseQuery;

    const snapshot = await getDocs(q);
    
    // Transform the data with proper typing
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        hits: data.hits || 0,
        misses: data.misses || 0,
        lastAccessed: data.lastAccessed?.toDate() || new Date(),
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
        restaurants: data.restaurants || 0,
        accessCount: data.accessCount,
        expired: data.expired,
        expirationDate: data.expirationDate?.toDate()
      } as CacheMetrics;
    });

  } catch (error) {
    console.error('Error fetching cache metrics:', error);
    return [];
  }
}

export async function saveBuildCache(
  lat: number,
  lng: number,
  countyName: string,
  townName: string,
  restaurants: CachedRestaurant[]
): Promise<void> {
  const cacheKey = getBuilderCacheKey(lat, lng, countyName, townName);
  const cacheRef = doc(db, BUILDER_CACHE_CONFIG.COLLECTION, cacheKey);
  const metricsRef = doc(db, 'cacheMetrics', cacheKey);

  try {
    const cacheData: BuilderCache = {
      countyName,
      townName,
      geohash: geohash.encode(lat, lng, BUILDER_CACHE_CONFIG.GEOHASH_PRECISION),
      timestamp: Date.now(),
      restaurants,
      lastUpdated: {
        restaurants: Date.now(),
        images: Date.now()
      }
    };

    await setDoc(cacheRef, cacheData);

    // Update metrics for new cache entry
    await setDoc(metricsRef, {
      lastUpdated: new Date(),
      restaurants: restaurants.length,
      hits: 0,
      misses: 0
    }, { merge: true });

    console.log(`✅ Saved to builder cache: ${cacheKey} (${restaurants.length} restaurants)`);
  } catch (error) {
    console.error(`❌ Error saving to cache ${cacheKey}:`, error);
    throw new Error(`Failed to save cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Utility function to check cache coverage for a county
export async function checkCountyCacheCoverage(countyName: string): Promise<{
  totalAreas: number;
  cachedAreas: number;
  expiredAreas: number;
  towns: Record<string, {
    cached: number;
    expired: number;
    total: number;
  }>;
}> {
  const cacheQuery = query(
    collection(db, BUILDER_CACHE_CONFIG.COLLECTION),
    where('countyName', '==', countyName)
  );

  const snapshot = await getDocs(cacheQuery);
  const now = Date.now();
  const coverage = {
    totalAreas: 0,
    cachedAreas: 0,
    expiredAreas: 0,
    towns: {} as Record<string, { cached: number; expired: number; total: number; }>
  };

  snapshot.forEach(doc => {
    const data = doc.data() as BuilderCache;
    const townName = data.townName;
    
    if (!coverage.towns[townName]) {
      coverage.towns[townName] = { cached: 0, expired: 0, total: 0 };
    }

    coverage.totalAreas++;
    coverage.towns[townName].total++;

    if (now - data.timestamp < BUILDER_CACHE_CONFIG.DURATION) {
      coverage.cachedAreas++;
      coverage.towns[townName].cached++;
    } else {
      coverage.expiredAreas++;
      coverage.towns[townName].expired++;
    }
  });

  return coverage;
}

// Update the database builder server action to use the new cache
export async function clearBuilderCache(
  lat?: number,
  lng?: number,
  countyName?: string,
  townName?: string
): Promise<void> {
  try {
    if (lat && lng && countyName && townName) {
      // Clear specific location cache
      const cacheKey = getBuilderCacheKey(lat, lng, countyName, townName);
      const cacheRef = doc(db, BUILDER_CACHE_CONFIG.COLLECTION, cacheKey);
      await deleteDoc(cacheRef);
      console.log(`Cleared cache for location: ${cacheKey}`);
    } else if (countyName && townName) {
      // Clear all caches for a specific town in a county
      const cacheQuery = query(
        collection(db, BUILDER_CACHE_CONFIG.COLLECTION),
        where('countyName', '==', countyName),
        where('townName', '==', townName)
      );
      const snapshot = await getDocs(cacheQuery);
      await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
      console.log(`Cleared all caches for ${townName} in ${countyName}`);
    } else if (countyName) {
      // Clear all caches for a county
      const cacheQuery = query(
        collection(db, BUILDER_CACHE_CONFIG.COLLECTION),
        where('countyName', '==', countyName)
      );
      const snapshot = await getDocs(cacheQuery);
      await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
      console.log(`Cleared all caches for ${countyName}`);
    } else {
      // Clear all caches
      const snapshot = await getDocs(collection(db, BUILDER_CACHE_CONFIG.COLLECTION));
      await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
      console.log('Cleared all caches');
    }
  } catch (error) {

    console.error('Error clearing cache:', error);
    throw error;
  }
}

// Helper function for builder.ts to use
export async function clearLocationCache(lat: number, lng: number): Promise<void> {
  // Get all caches that might match this location
  const locationHash = geohash.encode(lat, lng, BUILDER_CACHE_CONFIG.GEOHASH_PRECISION);
  const cacheQuery = query(
    collection(db, BUILDER_CACHE_CONFIG.COLLECTION),
    where('geohash', '==', locationHash)
  );

  const snapshot = await getDocs(cacheQuery);
  await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
  console.log(`Cleared cache for location hash: ${locationHash}`);
}