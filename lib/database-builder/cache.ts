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
  
  // Add cache metrics tracking
  const metricsRef = doc(db, 'cacheMetrics', cacheKey);
  
  try {
    const docSnap = await getDoc(cacheRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as BuilderCache;
      const cacheTime = data.timestamp;

      // Record cache access
      await setDoc(metricsRef, {
        lastAccessed: new Date(),
        accessCount: increment(1),
        cacheKey,
        county: countyName,
        town: townName,
        location: { lat, lng },
      }, { merge: true });

      // Verify cache is still valid
      if (Date.now() - cacheTime < BUILDER_CACHE_CONFIG.DURATION) {
        console.log(`Cache HIT in builder cache for location key: ${cacheKey}`);
        return data.restaurants;
      } else {
        console.log(`Cache EXPIRED in builder cache for location key: ${cacheKey}`);
        // Record cache expiration
        await setDoc(metricsRef, {
          expired: true,
          expirationDate: new Date()
        }, { merge: true });
      }
    }

    console.log(`Cache MISS in builder cache for location key: ${cacheKey}`);
    // Record cache miss
    await setDoc(metricsRef, {
      misses: increment(1),
      lastMiss: new Date()
    }, { merge: true });
    
    return null;
  } catch (error) {
    console.error('Error accessing cache:', error);
    return null;
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
  console.log(`Saved to builder cache: ${cacheKey}`);
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