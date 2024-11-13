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
  getDoc
} from 'firebase/firestore';
import { CONFIG } from './config';
import type { CountyStats, MonitoringStats, ProcessingProgress } from './types';

// Core monitoring functions
export async function getCountyStats(countyName: string): Promise<CountyStats> {
  const countyRef = doc(db, CONFIG.FIRESTORE.COLLECTIONS.COUNTIES, countyName);
  const countyDoc = await getDoc(countyRef);
  
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

  // Get all towns in county
  const townsSnapshot = await getDocs(collection(countyRef, CONFIG.FIRESTORE.COLLECTIONS.TOWNS));
  
  // Process each town
  for (const townDoc of townsSnapshot.docs) {
    const townStats = {
      name: townDoc.data().name,
      restaurants: 0,
      photos: 0,
      menus: 0
    };

    // Get all restaurants in town
    const restaurantsSnapshot = await getDocs(
      collection(townDoc.ref, CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS)
    );

    // Calculate town statistics
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

// Get monitoring stats for multiple counties
export async function getMonitoringStats(countyNames: string[]): Promise<MonitoringStats> {
  const countyStats = await Promise.all(
    countyNames.map(county => getCountyStats(county))
  );

  const summary = {
    totalRestaurants: countyStats.reduce((sum, county) => sum + county.restaurants, 0),
    totalPhotos: countyStats.reduce((sum, county) => sum + county.photos, 0),
    totalMenus: countyStats.reduce((sum, county) => sum + county.menus, 0),
    countiesCovered: countyStats.length,
    townsCovered: countyStats.reduce((sum, county) => sum + county.towns.length, 0),
    lastUpdated: new Date(),
    counties: countyStats
  };

  return summary;
}

// Function to find incomplete/missing data
export async function findIncompleteData() {
  const results = {
    noPhotos: [] as any[],
    noMenus: [] as any[],
    incompleteInfo: [] as any[]
  };

  const restaurantsRef = collection(db, CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS);

  // Find restaurants with no photos
  const noPhotosQuery = query(restaurantsRef, where('photos', '==', []));
  const noPhotosSnap = await getDocs(noPhotosQuery);
  results.noPhotos = noPhotosSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Find restaurants with no menus
  const noMenusQuery = query(restaurantsRef, where('menuCount', '==', 0));
  const noMenusSnap = await getDocs(noMenusQuery);
  results.noMenus = noMenusSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Find restaurants with incomplete information
  const incompleteQuery = query(
    restaurantsRef,
    where('lastUpdated', '<', new Date(Date.now() - CONFIG.CACHE.DURATION))
  );
  const incompleteSnap = await getDocs(incompleteQuery);
  results.incompleteInfo = incompleteSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return results;
}

// Function to get processing progress
export async function getProcessingProgress(): Promise<ProcessingProgress> {
  const startDate = new Date(CONFIG.PROCESSING.START_DATE);
  const currentDate = new Date();
  const elapsedDays = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const processedLocationsQuery = query(
    collection(db, CONFIG.FIRESTORE.COLLECTIONS.LOCATION_CACHE),
    orderBy('timestamp', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(processedLocationsQuery);
  const lastProcessed = snapshot.docs[0]?.data();

  return {
    totalDays: elapsedDays,
    lastProcessed: lastProcessed ? {
      timestamp: lastProcessed.timestamp.toDate(),
      location: lastProcessed.location
    } : null,
    progress: {
      processed: await getProcessedLocationsCount(),
      total: CONFIG.PROCESSING.TOTAL_LOCATIONS
    }
  };
}

// Helper function to get processed locations count
async function getProcessedLocationsCount(): Promise<number> {
  const snapshot = await getDocs(
    collection(db, CONFIG.FIRESTORE.COLLECTIONS.LOCATION_CACHE)
  );
  return snapshot.size;
}