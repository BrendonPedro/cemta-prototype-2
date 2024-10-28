// lib/database-builder/monitoring.ts
import { db } from './db';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  collectionGroup,
  doc,
  getDoc,
  DocumentData
} from 'firebase/firestore';
import { CONFIG } from './config';
import type { CountyStats } from './types';

export interface MonitoringStats {
  totalRestaurants: number;
  totalPhotos: number;
  totalMenus: number;
  countiesCovered: number;
  townsCovered: number;
  lastUpdated: Date | null;
  counties: Array<{
    name: string;
    restaurants: number;
    photos: number;
    menus: number;
    towns: Array<{
      name: string;
      restaurants: number;
      photos: number;
      menus: number;
    }>;
  }>;
}

export interface ProcessingProgress {
  lastProcessedLocation: {
    lat: number;
    lng: number;
  };
  lastProcessedTimestamp: Date;
  totalLocationsProcessed: number;
  estimatedCompletion: Date;
}

export async function getCountyStats(countyName: string): Promise<CountyStats> {
  const countyDoc = await getDoc(doc(db, CONFIG.FIRESTORE.COLLECTIONS.COUNTIES, countyName));
  if (!countyDoc.exists()) {
    throw new Error(`County ${countyName} not found`);
  }

  const stats: CountyStats = {
    name: countyName,
    restaurants: 0,
    photos: 0,
    menus: 0,
    towns: []
  };

  const townsSnapshot = await getDocs(
    collection(countyDoc.ref, CONFIG.FIRESTORE.COLLECTIONS.TOWNS)
  );

  for (const townDoc of townsSnapshot.docs) {
    const townStats = {
      name: townDoc.data().name,
      restaurants: 0,
      photos: 0,
      menus: 0
    };

    const restaurantsSnapshot = await getDocs(
      collection(townDoc.ref, CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS)
    );

    restaurantsSnapshot.forEach(restaurantDoc => {
      const data = restaurantDoc.data();
      townStats.restaurants++;
      townStats.photos += data.photos?.length || 0;
      townStats.menus += data.menuCount || 0;
    });

    stats.towns.push(townStats);
    stats.restaurants += townStats.restaurants;
    stats.photos += townStats.photos;
    stats.menus += townStats.menus;
  }

  return stats;
}

export async function findIncompleteData() {
  const results = {
    noPhotos: [] as DocumentData[],
    noMenus: [] as DocumentData[],
    lowQuality: [] as DocumentData[]
  };

  // Find restaurants with no photos
  const noPhotosQuery = query(
    collection(db, CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS),
    where('photos', '==', [])
  );
  const noPhotosSnapshot = await getDocs(noPhotosQuery);
  results.noPhotos = noPhotosSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Find restaurants with no menus
  const noMenusQuery = query(
    collection(db, CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS),
    where('menuCount', '==', 0)
  );
  const noMenusSnapshot = await getDocs(noMenusQuery);
  results.noMenus = noMenusSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Find low quality entries (e.g., missing important data)
  const lowQualityQuery = query(
    collection(db, CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS),
    where('rating', '==', 0)
  );
  const lowQualitySnapshot = await getDocs(lowQualityQuery);
  results.lowQuality = lowQualitySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return results;
}

export async function getProcessingProgress() {
  const lastProcessedQuery = query(
    collection(db, CONFIG.FIRESTORE.COLLECTIONS.CACHE),
    orderBy('timestamp', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(lastProcessedQuery);
  
  if (snapshot.empty) {
    throw new Error('No processing history found');
  }

  const lastProcessed = snapshot.docs[0].data();
  const totalProcessed = (await getDocs(
    collection(db, CONFIG.FIRESTORE.COLLECTIONS.CACHE)
  )).size;

  const startTime = new Date(CONFIG.PROCESSING.START_DATE).getTime();
  const currentTime = Date.now();
  const timeElapsed = currentTime - startTime;
  const processRate = totalProcessed / timeElapsed;
  const remainingLocations = CONFIG.PROCESSING.TOTAL_LOCATIONS - totalProcessed;
  const estimatedTimeRemaining = remainingLocations / processRate;

  return {
    lastProcessedLocation: lastProcessed.location,
    lastProcessedTimestamp: lastProcessed.timestamp.toDate(),
    totalLocationsProcessed: totalProcessed,
    estimatedCompletion: new Date(currentTime + estimatedTimeRemaining)
  };
}

export { processCounty } from './index';

