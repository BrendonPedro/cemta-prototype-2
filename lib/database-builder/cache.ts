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
    serverTimestamp, 
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
  const metricsCacheRef = doc(db, 'cacheMetrics', cacheKey);

  console.log(`🔍 Checking cache for key: ${cacheKey}`);
  console.log(`📍 Location: ${lat}, ${lng}`);
  console.log(`🏙️ Area: ${countyName} - ${townName}`);

  try {
    // Check main cache
    const cacheDoc = await getDoc(cacheRef);
    
    if (cacheDoc.exists()) {
      const data = cacheDoc.data() as BuilderCache;
      const age = Date.now() - data.timestamp;
      const ageHours = Math.round(age / (1000 * 60 * 60));
      
      console.log(`📊 Cache entry found:`);
      console.log(`   Age: ${ageHours} hours`);
      console.log(`   Restaurants: ${data.restaurants.length}`);
      console.log(`   Last Updated: ${new Date(data.lastUpdated.restaurants).toLocaleString()}`);

      if (age < BUILDER_CACHE_CONFIG.DURATION) {
        console.log(`✅ Cache HIT - Using cached data`);
        
        // Update metrics for cache hit
        await setDoc(metricsCacheRef, {
          county: countyName,
          town: townName,
          location: { lat, lng },
          lastAccessed: serverTimestamp(),
          hits: increment(1)
        }, { merge: true });

        return data.restaurants;
      } else {
        console.log(`⚠️ Cache EXPIRED - ${ageHours} hours old (max ${BUILDER_CACHE_CONFIG.DURATION / (1000 * 60 * 60)} hours)`);
      }
    } else {
      console.log(`❌ No cache entry found in ${BUILDER_CACHE_CONFIG.COLLECTION}`);
    }

    // Update metrics for cache miss
    await setDoc(metricsCacheRef, {
      county: countyName,
      town: townName,
      location: { lat, lng },
      lastAccessed: serverTimestamp(),
      misses: increment(1)
    }, { merge: true });

    return null;
  } catch (error) {
    console.error('Error accessing cache:', error);
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
  
  // Save to databaseBuilderCache (main cache data)
  const cacheRef = doc(db, BUILDER_CACHE_CONFIG.COLLECTION, cacheKey);
  // Metrics ref remains the same
  const metricsCacheRef = doc(db, 'cacheMetrics', cacheKey);

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

  try {
    console.log(`📥 Saving cache data for ${cacheKey} with ${restaurants.length} restaurants`);
    
    // First, save the actual cache data
    await setDoc(cacheRef, cacheData);
    console.log(`✅ Saved restaurant data to cache`);

    // Then update the metrics
    await setDoc(metricsCacheRef, {
      county: countyName,
      town: townName,
      location: { lat, lng },
      lastAccessed: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      hits: increment(1),
      restaurantCount: restaurants.length
    }, { merge: true });
    console.log(`✅ Updated cache metrics`);

    // Verify the save
    const verification = await getDoc(cacheRef);
    if (verification.exists()) {
      console.log(`✅ Cache verified - data saved successfully`);
    } else {
      console.warn(`⚠️ Cache verification failed - data may not have been saved`);
    }

  } catch (error) {
    console.error(`❌ Error saving cache for ${cacheKey}:`, error);
    throw error;
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