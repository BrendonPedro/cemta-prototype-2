// lib/database-builder/firestore.ts

import { db } from "@/lib/database-builder/db";
import { 
  doc, 
  setDoc, 
  serverTimestamp,
  increment,
  writeBatch 
} from "firebase/firestore";
import { CONFIG } from './config';
import type { RestaurantData } from './types';

export async function saveRestaurantData(
  restaurantData: RestaurantData,
  countyName: string,
  townName: string
): Promise<void> {
  const batch = writeBatch(db);

  // Clean the restaurant data to replace undefined with null
  const cleanedData = {
    ...restaurantData,
    yelpId: restaurantData.yelpId || null,  // Replace undefined with null
    yelpRating: restaurantData.yelpRating || null,
    priceLevel: restaurantData.priceLevel || null,
    phone: restaurantData.phone || null,
    website: restaurantData.website || null,
    photos: restaurantData.photos || [],     // Ensure photos is always an array
    menuCount: restaurantData.menuCount || 0,
    countyName,
    townName,
    lastUpdated: serverTimestamp()
  };

  // County document with town subcollection
  const countyRef = doc(db, CONFIG.FIRESTORE.COLLECTIONS.COUNTIES, countyName);
  const townRef = doc(countyRef, CONFIG.FIRESTORE.COLLECTIONS.TOWNS, townName);
  const restaurantRef = doc(townRef, CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS, cleanedData.id);

  // Update county stats
  batch.set(countyRef, {
    name: countyName,
    restaurantCount: increment(1),
    lastUpdated: serverTimestamp()
  }, { merge: true });

  // Update town stats
  batch.set(townRef, {
    name: townName,
    restaurantCount: increment(1),
    lastUpdated: serverTimestamp()
  }, { merge: true });

  // Save restaurant data
  batch.set(restaurantRef, cleanedData);

  // Also save to global restaurants collection for easy querying
  const globalRestaurantRef = doc(db, CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS, cleanedData.id);
  batch.set(globalRestaurantRef, cleanedData);

  await batch.commit();
}
