// app/scripts/database-builder/management.ts

import { db } from "@/config/firebaseConfig";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  collectionGroup,
  doc,
} from "firebase/firestore";
import { CONFIG } from './config';

export class DatabaseManager {
  async getCountyStats(countyName: string) {
    const stats = {
      totalRestaurants: 0,
      totalPhotos: 0,
      totalMenus: 0,
      townsCovered: 0,
      lastUpdated: null as Date | null,
      towns: [] as Array<{
        name: string;
        restaurants: number;
        photos: number;
        menus: number;
      }>
    };

    const countyRef = doc(db, CONFIG.FIRESTORE.COLLECTIONS.COUNTIES, countyName);
    const townsSnapshot = await getDocs(collection(countyRef, CONFIG.FIRESTORE.COLLECTIONS.TOWNS));

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
      stats.totalRestaurants += townStats.restaurants;
      stats.totalPhotos += townStats.photos;
      stats.totalMenus += townStats.menus;
    }

    stats.townsCovered = stats.towns.length;
    return stats;
  }

  async findIncompleteRestaurants(criteria: {
    minPhotos?: number;
    requireMenu?: boolean;
    requireYelp?: boolean;
  }) {
    const restaurants = await getDocs(
      query(
        collectionGroup(db, CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS),
        where('photos', '<', criteria.minPhotos || 1)
      )
    );

    return restaurants.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getProcessingProgress() {
    const snapshot = await getDocs(
      query(
        collection(db, CONFIG.FIRESTORE.COLLECTIONS.METRICS_CACHE), //Check this collection name again (i.e. should it be metrics_cache)
        orderBy('timestamp', 'desc'),
        limit(1)
      )
    );

    if (!snapshot.empty) {
      const lastProcessed = snapshot.docs[0].data();
      return {
        lastProcessedLocation: lastProcessed.location,
        lastProcessedTimestamp: lastProcessed.timestamp,
        totalLocationsProcessed: (await getDocs(
          collection(db, CONFIG.FIRESTORE.COLLECTIONS.LOCATION_CACHE) //Check this collection name again (i.e. should it be location_cache)
        )).size
      };
    }

    return null;
  }
}

