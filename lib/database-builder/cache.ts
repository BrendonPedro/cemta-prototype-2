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
import type { CachedRestaurant } from '@/app/services/restaurant/types';
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
    restaurants: FirebaseFirestore.FieldValue;
    images: FirebaseFirestore.FieldValue;
  };
}


export interface CacheConfig {
  COLLECTIONS: {
    LOCATION: string;
    METRICS: string;
  };
  DURATION: number;
  GEOHASH: {
    LOCATION_PRECISION: number;
    METRICS_PRECISION: number;
  };
}

export interface Config {
  API: {
    GOOGLE_BATCH_SIZE: number;
    YELP_BATCH_SIZE: number;
    DELAY_BETWEEN_CALLS: number;
    MAX_RETRIES: number;
    RETRY_DELAY: number;
  };
  PATHS: {
    IMAGES: string;
    ORIGINAL_MENUS: string;
    PROCESSED_MENUS: string;
  };
  FIRESTORE: {
    COLLECTIONS: {
      COUNTIES: string;
      TOWNS: string;
      RESTAURANTS: string;
      MENUS: string;
      LOCATION_CACHE: string;
      METRICS_CACHE: string;
    };
  };
  CACHE: {
    DURATION: number;
    GEOHASH: {
      LOCATION_PRECISION: number;
      METRICS_PRECISION: number;
    };
  };
  PROCESSING: {
    START_DATE: string;
    TOTAL_LOCATIONS: number;
    BATCH_SIZE: number;
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

export const CACHE_CONFIG = {
  COLLECTIONS: {
    LOCATION: CONFIG.FIRESTORE.COLLECTIONS.LOCATION_CACHE,
    METRICS: CONFIG.FIRESTORE.COLLECTIONS.METRICS_CACHE
  },
  DURATION: CONFIG.CACHE.DURATION,
  GEOHASH: CONFIG.CACHE.GEOHASH
};



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
    const snapshot = await getDocs(collection(db, CACHE_CONFIG.COLLECTIONS.LOCATION));
    
    const expiredDocs = snapshot.docs.filter(doc => {
      const data = doc.data() as BuilderCache;
      return now - data.timestamp > CACHE_CONFIG.DURATION;
    });

    await Promise.all(expiredDocs.map(doc => deleteDoc(doc.ref)));
    
    console.log(`🧹 Cleaned up ${expiredDocs.length} expired cache entries`);
    return expiredDocs.length;
  } catch (error) {
    console.error('Error cleaning up expired cache:', error);
    return 0;
  }
}


function getBuilderCacheKey(lat: number, lng: number, countyName: string, townName: string): string {
  const locationHash = geohash.encode(lat, lng, CACHE_CONFIG.GEOHASH.METRICS_PRECISION);
  return `${countyName.toLowerCase()}_${townName.toLowerCase()}_${locationHash}`;
}

export async function getCachedBuildData(
  lat: number,
  lng: number,
  countyName: string,
  townName: string
): Promise<CachedRestaurant[] | null> {
  // Use shorter precision for locationCaches
  const locationHash = geohash.encode(lat, lng, CACHE_CONFIG.GEOHASH.LOCATION_PRECISION);
  const cacheRef = doc(db, CACHE_CONFIG.COLLECTIONS.LOCATION, locationHash);
  
  // Use longer precision for metrics
  const metricsHash = geohash.encode(lat, lng, CACHE_CONFIG.GEOHASH.METRICS_PRECISION);
  const metricsKey = `${countyName.toLowerCase()}_${townName.toLowerCase()}_${metricsHash}`;
  const metricsCacheRef = doc(db, CACHE_CONFIG.COLLECTIONS.METRICS, metricsKey);

  console.log(`🔍 Checking cache for key: ${metricsKey}`);
  console.log(`📍 Location: ${lat}, ${lng}`);
  console.log(`🏙️ Area: ${countyName} - ${townName}`);

  try {
    // Check location cache
    const cacheDoc = await getDoc(cacheRef);
    
    if (cacheDoc.exists()) {
      const data = cacheDoc.data();
      const age = Date.now() - (data.cachedAt?.toMillis() || data.timestamp || 0);
      const ageHours = Math.round(age / (1000 * 60 * 60));
      
      console.log(`📊 Cache entry found:`);
      console.log(`   Age: ${ageHours} hours`);
      console.log(`   Restaurants: ${data.restaurants?.length || 0}`);
      console.log(`   Location Hash: ${locationHash}`);

      if (age < CACHE_CONFIG.DURATION) {
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
      }
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
  // Use shorter precision for location cache
  const locationHash = geohash.encode(lat, lng, CACHE_CONFIG.GEOHASH.LOCATION_PRECISION);
  const locationCacheRef = doc(db, CACHE_CONFIG.COLLECTIONS.LOCATION, locationHash);

  // Use longer precision for metrics
  const metricsHash = geohash.encode(lat, lng, CACHE_CONFIG.GEOHASH.METRICS_PRECISION);
  const metricsKey = `${countyName.toLowerCase()}_${townName.toLowerCase()}_${metricsHash}`;
  const metricsCacheRef = doc(db, CACHE_CONFIG.COLLECTIONS.METRICS, metricsKey);

  const cacheData: BuilderCache = {
    countyName,
    townName,
    geohash: locationHash,
    timestamp: Date.now(),
    restaurants,
    lastUpdated: {
      restaurants: serverTimestamp(),
      images: serverTimestamp()
    }
  };

  try {
    console.log(`📥 Saving cache data for location hash: ${locationHash}`);
    console.log(`📊 Metrics key: ${metricsKey}`);
    console.log(`📍 Restaurants count: ${restaurants.length}`);

    // Save to location cache
    await setDoc(locationCacheRef, cacheData);
    console.log(`✅ Saved restaurant data to location cache`);

    // Update metrics
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
    const verification = await getDoc(locationCacheRef);
    if (verification.exists()) {
      console.log(`✅ Cache verified - data saved successfully`);
      console.log(`📍 Saved ${verification.data().restaurants.length} restaurants`);
    } else {
      console.warn(`⚠️ Cache verification failed - data may not have been saved`);
    }

  } catch (error) {
    console.error(`❌ Error saving cache:`, error);
    console.error(`   Location Hash: ${locationHash}`);
    console.error(`   Metrics Key: ${metricsKey}`);
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
  collection(db, CACHE_CONFIG.COLLECTIONS.LOCATION),
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

    if (now - data.timestamp < CACHE_CONFIG.DURATION) {
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
    if (lat && lng && townName) {
      // Clear specific town's cache
      const locationHash = geohash.encode(lat, lng, CACHE_CONFIG.GEOHASH.LOCATION_PRECISION);
      const cacheRef = doc(db, CACHE_CONFIG.COLLECTIONS.LOCATION, locationHash);
      const cacheDoc = await getDoc(cacheRef);
      
      if (cacheDoc.exists() && cacheDoc.data().townName === townName) {
        await deleteDoc(cacheRef);
        console.log(`Cleared cache for ${townName} at location: ${locationHash}`);
      }
    } else if (countyName && townName) {
      // Clear all caches for a specific town in a county
      const cacheQuery = query(
        collection(db, CACHE_CONFIG.COLLECTIONS.LOCATION),
        where('countyName', '==', countyName),
        where('townName', '==', townName)
      );
      const snapshot = await getDocs(cacheQuery);
      await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
      console.log(`Cleared all caches for ${townName} in ${countyName}`);
    } else {
      // Don't clear all caches by default
      console.log('Operation requires specific town/location information');
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
    throw error;
  }
}

// Helper function for builder.ts to use
export async function clearLocationCache(lat: number, lng: number): Promise<void> {
  // Get all caches that might match this location
  const locationHash = geohash.encode(lat, lng, CACHE_CONFIG.GEOHASH.LOCATION_PRECISION)
  const cacheQuery = query(
    collection(db, CACHE_CONFIG.COLLECTIONS.LOCATION),
    where('geohash', '==', locationHash)
  );

  const snapshot = await getDocs(cacheQuery);
  await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
  console.log(`Cleared cache for location hash: ${locationHash}`);
}