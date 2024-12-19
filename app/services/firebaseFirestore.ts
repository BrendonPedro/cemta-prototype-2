// app/services/firebaseFirestore.ts

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  DocumentData,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  increment,
  collectionGroup,
  PartialWithFieldValue, 
  SetOptions,
  DocumentReference,
  WriteBatch,
} from "firebase/firestore";
import geohash from 'ngeohash';
import { db } from "@/lib/database-builder/db";
import { CONFIG } from '@/lib/database-builder/config';
import type { Restaurant, CachedRestaurant, OpeningHours, MenuSummary, Photo, SaveRestaurantResult, SaveRestaurantOptions } from '@/interfaces/restaurant/types';
import { calculateDistance } from '@/app/utils/locationUtils'
import type { UserPreferences } from "@/interfaces/users/user-preferences";
import type { PlaceData } from "@googlemaps/google-maps-services-js";
import { calculateMatchScore } from '@/app/utils/restaurantMatching';
import { DEFAULT_LOCATION, determineLocationDetails } from "@/app/services/locationService";

// For the county/town creation part:
type RestaurantDocData = WithFieldValue<DocumentData>;
type BatchOptions = { merge?: boolean };

// ======= Basic Types and Shared Interfaces =======
// (Used across multiple components)
export interface Location {
  latitude: number;
  longitude: number;
}

// (Used in RestaurantPage.tsx)
export interface BusinessHours {
  day: string;
  start: string;
  end: string;
}

// ======= Restaurant Related Interfaces =======
// (Used in RestaurantPage.tsx and firestore.ts)
export interface RestaurantDocument {
  id: string;
  name: string;
  address: string;
  rating: number;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  county?: string;
  yelpId?: string;
  yelpRating?: number;
  menuSource?: 'yelp' | 'google' | 'user';
  imageUrl?: string;
  phone?: string;
  website?: string;
  hours?: BusinessHours[];
  priceLevel?: string;
  photos: string[];
  menuCount: number;
  lastUpdated: string;
  source: {
    google: boolean;
    yelp: boolean;
  };
  createdAt?: Date;  
}

// (Used in RestaurantPage.tsx)
export interface RestaurantDetails {
  id: string;
  name: string;
  address: string;
  rating: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  phone?: string;
  website?: string;
  priceLevel?: string;
  hours?: BusinessHours[];
  photos?: Photo[];
  yelpId?: string;
  menuCount?: number;
  county?: string;
  createdAt?: Date;
  lastUpdated?: Date;
  openingHours?: OpeningHours | null;
}

// ======= Menu Related Interfaces =======
// (Used in VertexAiResultsDisplay.tsx and MenuDataDisplay.tsx)
export interface MenuItemName {
  original: string;
  pinyin: string;
  english: string;
}

export interface MenuItemDescription {
  original: string;
  english: string;
}

export interface MenuItemPrice {
  amount: number;
  currency: string;
}

export interface MenuUpgrade {
  name: string;
  price: string;
}

// (Used in VertexAiResultsDisplay.tsx, MenuDataDisplay.tsx, and vertex-ai/route.ts)
export interface MenuItem {
  name: MenuItemName;
  description: MenuItemDescription | null;
  price?: MenuItemPrice;
  prices?: { [key: string]: string };
  image_url?: string;
  dietary_info?: string[];
  sizes?: { [key: string]: string };
  popular: boolean;
  chef_recommended: boolean;
  spice_level: string;
  allergy_alert: string;
  upgrades: MenuUpgrade[];
  notes: string;
}

export interface MenuCategory {
  name: MenuItemName;
  items: MenuItem[];
}

// (Used in VertexAiResultsDisplay.tsx and vertex-ai/route.ts)
export interface RestaurantInfo {
  name: { original: string; english: string } | string;
  address: { original: string; english: string } | string;
  operating_hours: string;
  phone_number: string;
  website: string;
  social_media: string;
  description: { original: string; english: string } | string;
  additional_notes: string;
}

export interface MenuData {
  restaurant_info: RestaurantInfo;
  categories: MenuCategory[];
  other_info: string;
}

// (Used across multiple components including VertexAiResultsDisplay.tsx and process-menu-image/route.ts)
export interface MenuDetails {
  id: string;
  imageUrl: string;
  userId: string;
  menuName: string;
  restaurantName: string;
  location?: string;
  timestamp: Date;
  menuData: MenuData;
}

// ======= Yelp Related Interfaces =======
// (Used in yelpService.ts and nearby-restaurants/route.ts)
export interface YelpBusiness {
  id: string;
  name: string;
  photos: string[];
  rating: number;
  display_phone?: string;
  url?: string;
  price_level?: string;
  hours?: Array<{
    hours_type: string;
    open: Array<{
      day: number;
      start: string;
      end: string;
    }>;
  }>;
  location: {
    address1: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  categories: Array<{
    alias: string;
    title: string;
  }>;
}

// ======= Search and History Related Interfaces =======
// (Used in firestore.ts and search components)
export interface SearchResult {
  id: string;
  name: string;           
  address: string;        
  imageUrl?: string;
  rating?: number;
  county?: string;
}

// (Used in VertexAiResultsDisplay.tsx)
export interface HistoryItem {
  id: string;
  menuName: string;
  timestamp: Date;
}

// Used in restaurant/page.tsx and firestores
export interface EnhancedSearchResult extends SearchResult {
  hasMenu?: boolean;
  menuCount?: number;
  hasGoogleData?: boolean;
  hasYelpData?: boolean;
}

export interface WithFieldValue<T> {
  [x: string]: any;
}

export interface DocumentWrite {
  type: 'set' | 'update' | 'delete';
  data?: DocumentData;
  options?: SetOptions;
}

export interface FirestoreData extends DocumentData {
  [field: string]: any;
}

// ======= Type Aliases =======
// (Used for backward compatibility)
export type Menu = MenuDetails;
export type LatLngLiteral = Location

const RESTAURANT_DETAILS_COLLECTION = "restaurantDetails";

const SAVE_DEBOUNCE_TIME = 2000; // 2 seconds
const VERIFICATION_INTERVAL = 30000; // 30 seconds
const saveQueue = new Map<string, NodeJS.Timeout>();
let lastVerificationTime = 0;

export async function batchUpdateRestaurants(
  restaurants: CachedRestaurant[],
  signal?: AbortSignal
): Promise<void> {
  const chunkSize = 500;
  for (let i = 0; i < restaurants.length; i += chunkSize) {
    if (signal?.aborted) {
      throw new Error('Operation aborted');
    }

    const chunk = restaurants.slice(i, Math.min(i + chunkSize, restaurants.length));
    const batch = writeBatch(db);

    chunk.forEach(restaurant => {
      const ref = doc(db, 'restaurants', restaurant.id);
      batch.set(ref, {
        name: restaurant.name,
        address: restaurant.address,
        rating: restaurant.rating,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        county: restaurant.county,
        townName: restaurant.townName,
        menuCount: restaurant.menuCount || 0,
        hasMenu: !!restaurant.menuCount,
        hasDetailsFetched: true,
        lastUpdated: serverTimestamp(), // Use Firestore server timestamp
        createdAt: restaurant.createdAt || serverTimestamp()
      }, { merge: true });
    });

    await batch.commit();
  }
}


export async function saveDocumentAiResults(
  userId: string,
  imageUrl: string,
  menu: Menu,
) {
  const userRef = doc(db, "users", userId);
  const resultsRef = doc(
    userRef,
    "documentAiResults",
    new Date().toISOString(),
  );

  await setDoc(resultsRef, {
    imageUrl,
    menu,
    timestamp: new Date().toISOString(),
  });

  // Update the user's latest processing ID
  await updateDoc(userRef, { latestDocumentAiProcessingId: resultsRef.id });
}

export async function getDocumentAiResults(
  userId: string,
  processingId?: string,
) {
  const userRef = doc(db, "users", userId);
  let resultsRef;

  if (processingId) {
    resultsRef = doc(userRef, "documentAiResults", processingId);
  } else {
    const userDoc = await getDoc(userRef);
    const latestProcessingId = userDoc.data()?.latestDocumentAiProcessingId;
    if (!latestProcessingId) {
      return null;
    }
    resultsRef = doc(userRef, "documentAiResults", latestProcessingId);
  }

  const docSnap = await getDoc(resultsRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    console.log("No such document!");
    return null;
  }
}

export async function checkExistingMenuForRestaurant(
  restaurantId: string,
): Promise<boolean> {
  const menusRef = collection(db, "restaurants", restaurantId, "menus");
  const q = query(menusRef, orderBy("timestamp", "desc"), limit(1));
  const querySnapshot = await getDocs(q);

  return !querySnapshot.empty;
}

export async function checkExistingMenus(
  userId: string,
  fileName: string,
): Promise<string[]> {
  const userRef = doc(db, "users", userId);
  const resultsCollection = collection(userRef, "vertexAiResults");
  const q = query(
    resultsCollection,
    where("menuName", ">=", fileName),
    where("menuName", "<=", fileName + "\uf8ff"),
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => doc.data().menuName);
}

export async function getMenuCount(userId: string): Promise<number> {
  const menusCollection = collection(db, "menus");
  const q = query(menusCollection, where("userId", "==", userId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.size;
}

// Function to get menu count for a specific restaurant
export async function getMenuCountForRestaurant(
  userId: string,
  restaurantId: string,
): Promise<number> {
  const menusCollection = collection(db, "menus");
  const q = query(
    menusCollection,
    where("userId", "==", userId),
    where("restaurantId", "==", restaurantId),
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.size;
}

export function listenToLatestProcessingId(
  userId: string,
  callback: (latestId: string) => void,
) {
  const userRef = doc(db, "users", userId);
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      const latestId = doc.data()?.latestVertexAiProcessingId;
      if (latestId) {
        callback(latestId);
      }
    }
  });
}

export async function getVertexAiResults(userId: string, menuId: string) {
  if (!menuId) {
    throw new Error("No menu ID provided");
  }

  console.log("Fetching menu data for menuId:", menuId);

  const menuRef = doc(db, "menus", menuId);
  const menuSnap = await getDoc(menuRef);

  if (menuSnap.exists()) {
    const data = menuSnap.data();
    if (data.userId === userId) {
      // If menuData is stored as a string, parse it
      const menuData = typeof data.menuData === 'string' ? JSON.parse(data.menuData) : data.menuData;
      return {
        menuData,
        processingId: menuSnap.id,
        timestamp: data.timestamp
          ? data.timestamp.toDate().toISOString()
          : new Date().toISOString(),
        restaurantValidated: data.restaurantValidated || false,
        validatorValidated: data.validatorValidated || false,
        restaurantName: data.restaurantName || menuData?.restaurant_info?.name?.original,
        imageUrl: data.imageUrl || null,
      };
    } else {
      console.error("Unauthorized access to menu data. User ID mismatch.");
      throw new Error("Unauthorized access to menu data");
    }
  } else {
    console.error("No menu data found for menuId:", menuId);
    throw new Error("No menu data found");
  }
}

// Function to get menu data by restaurant name
export async function getVertexAiResultsByRestaurant(
  userId: string,
  menuName: string,
) {
  const menusCollection = collection(db, "menus");
  const q = query(
    menusCollection,
    where("menuName", "==", menuName),
    where("userId", "==", userId),
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
     const menuData =
      typeof data.menuData === "string"
        ? JSON.parse(data.menuData)
        : data.menuData;

    return {
      id: docSnap.id,
      ...data,
      menuData,
      cached: data.cached || false,
      timestamp: data.timestamp
        ? data.timestamp.toDate().toISOString()
        : new Date().toISOString(),
      // Ensure restaurantName is included
      restaurantName:
        data.restaurantName ||
        menuData?.restaurant_info?.name?.original ||
        "Unknown",
    };
  } else {
    return null;
  }
}

export async function updateVertexAiResults(
  userId: string,
  processingId: string,
  menuData: any,
) {
  const menuRef = doc(db, "menus", processingId);

  // Ensure the user is authorized to update this menu
  const menuSnap = await getDoc(menuRef);
  if (menuSnap.exists()) {
    const data = menuSnap.data();
    if (data.userId === userId) {
      await updateDoc(menuRef, { menuData });
    } else {
      console.error(
        "Unauthorized access to update menu data. User ID mismatch.",
      );
      throw new Error("Unauthorized access to update menu data");
    }
  } else {
    console.error("No menu data found for processingId:", processingId);
    throw new Error("No menu data found");
  }
}

export async function getVertexAiHistory(userId: string) {
  const menusCollection = collection(db, "menus");
  const q = query(
    menusCollection,
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(10),
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    menuName: doc.data().menuName,
    timestamp: doc.data().timestamp,
  }));
}


// Get cached restaurant details from Firestore
export async function getCachedRestaurantDetails(
  restaurantId: string
): Promise<Restaurant | null> {
  console.log(`🔍 [CACHE] Checking cache for restaurant: ${restaurantId}`);
  const restaurantRef = doc(db, "restaurants", restaurantId);

  try {
    const docSnap = await getDoc(restaurantRef);

    if (docSnap.exists()) {
      console.log('💰 [SAVINGS] Found cached restaurant details');
      const data = docSnap.data();
      
      // Handle different timestamp formats
      let lastUpdatedDate: Date;
      if (data.lastUpdated?.toDate) {
        // Firestore Timestamp
        lastUpdatedDate = data.lastUpdated.toDate();
      } else if (data.lastUpdated instanceof Date) {
        // JavaScript Date
        lastUpdatedDate = data.lastUpdated;
      } else if (typeof data.lastUpdated === 'string') {
        // ISO string
        lastUpdatedDate = new Date(data.lastUpdated);
      } else {
        // Default to current time if no valid date found
        lastUpdatedDate = new Date();
      }

      // Check if the cache is still valid
      if (Date.now() - lastUpdatedDate.getTime() > CACHE_CONSTANTS.DURATION) {
        console.log('⚠️ [CACHE] Restaurant data is stale');
        return null;
      }

      // Format the data before returning
      return {
        id: docSnap.id,
        ...data,
        lastUpdated: lastUpdatedDate.toISOString(), // Standardize the format
        createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
      } as Restaurant;
    }

    console.log('💰 [COST] No cached data found for restaurant');
    return null;
  } catch (error) {
    console.error('❌ [ERROR] Failed to fetch cached restaurant details:', error);
    return null;
  }
}

export function getLocationCacheKey(lat: number, lng: number): string {
  // Use geohash for consistent cache keys
  return geohash.encode(lat, lng, CONFIG.CACHE.GEOHASH.LOCATION_PRECISION);
}

export const CACHE_CONSTANTS = {
  COLLECTION_NAME: CONFIG.FIRESTORE.COLLECTIONS.LOCATION_CACHE,
  QUEUE_COLLECTION: CONFIG.FIRESTORE.COLLECTIONS.PROCESSING_QUEUE,
  API_USAGE_COLLECTION: CONFIG.FIRESTORE.COLLECTIONS.API_USAGE,
  METRICS_COLLECTION: CONFIG.FIRESTORE.COLLECTIONS.PROCESSING_METRICS,
  DURATION: CONFIG.CACHE.DURATION,
  GEOHASH_PRECISION: CONFIG.CACHE.GEOHASH.LOCATION_PRECISION
};

const CACHE_DURATION = CONFIG.CACHE.DURATION || 365 * 24 * 60 * 60 * 1000;
const SAVE_DEBOUNCE = 2000; // 2 seconds

export async function saveCachedRestaurantsForLocation(
  lat: number,
  lng: number,
  newRestaurants: CachedRestaurant[],
): Promise<void> {
  const locationKey = getLocationCacheKey(lat, lng);
  const cacheRef = doc(db, CACHE_CONSTANTS.COLLECTION_NAME, locationKey);

  try {
    // Get existing cache
    const cacheDoc = await getDoc(cacheRef);
    let existingRestaurants: CachedRestaurant[] = [];

    if (cacheDoc.exists()) {
      existingRestaurants = cacheDoc.data().restaurants || [];
      console.log(`Cache hit for ${locationKey} - ${existingRestaurants.length} restaurants`);
    } else {
      console.log(`Cache miss for ${locationKey}`);
    }

    // Create maps for both Google and Yelp IDs
    const seenGoogleIds = new Set<string>();
    const seenYelpIds = new Set<string>();
    
    const mergedRestaurants = [...existingRestaurants, ...newRestaurants]
      .filter(restaurant => {
        const googleDuplicate = restaurant.id && seenGoogleIds.has(restaurant.id);
        const yelpDuplicate = restaurant.yelpId && seenYelpIds.has(restaurant.yelpId);

        if (googleDuplicate || yelpDuplicate) return false;

        if (restaurant.id) seenGoogleIds.add(restaurant.id);
        if (restaurant.yelpId) seenYelpIds.add(restaurant.yelpId);
        
        return true;
      });

    // Sort by distance but don't slice - keep all unique restaurants
    const sortedRestaurants = mergedRestaurants
      .sort((a, b) => {
        const distA = calculateDistance(lat, lng, a.latitude, a.longitude);
        const distB = calculateDistance(lat, lng, b.latitude, b.longitude);
        return distA - distB;
      });

    // Only save if there are actual changes
    if (mergedRestaurants.length !== existingRestaurants.length) {
      console.log(`Cache update summary for ${locationKey}:`);
      console.log(`- Existing restaurants: ${existingRestaurants.length}`);
      console.log(`- New unique restaurants: ${newRestaurants.length}`);
      console.log(`- Total after merge: ${mergedRestaurants.length}`);

      // Save all restaurants to cache
      await setDoc(cacheRef, {
        restaurants: sortedRestaurants, // Save all restaurants, not just 20
        latitude: lat,
        longitude: lng,
        cachedAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        expiresAt: new Date(Date.now() + CACHE_CONSTANTS.DURATION),
        geohash: locationKey,
      });

      console.log(`Successfully updated collection: ${CACHE_CONSTANTS.COLLECTION_NAME}`);
    } else {
      console.log(`No new unique restaurants to add to cache ${locationKey}`);
    }
  } catch (error) {
    console.error('Error saving cache:', error);
    throw error;
  }
}

export async function getCachedRestaurantsForLocation(
  lat: number,
  lng: number
): Promise<CachedRestaurant[] | null> {
  const locationKey = getLocationCacheKey(lat, lng);
  const cacheRef = doc(db, CACHE_CONSTANTS.COLLECTION_NAME, locationKey);
  
  try {
    const cacheDoc = await getDoc(cacheRef);
    if (cacheDoc.exists()) {
      const data = cacheDoc.data();
      const cachedAt = data.cachedAt?.toDate() || new Date(0);
      
      if (!data.restaurants || !Array.isArray(data.restaurants)) {
        console.warn('Invalid cache data structure');
        return null;
      }

      if (Date.now() - cachedAt.getTime() < CONFIG.CACHE.DURATION) {
        console.log(`Cache hit for ${locationKey} - ${data.restaurants.length} restaurants`);
        return data.restaurants; // Return all cached restaurants
      } else {
        console.log(`Cache expired for ${locationKey}`);
        try {
          await deleteDoc(cacheRef);
        } catch (cleanupError) {
          console.warn('Failed to clean up expired cache:', cleanupError);
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error accessing cache:', error);
    return null;
  }
}


// Function to get menus for multiple restaurants
export async function getMenusForRestaurants(
  userId: string,
  restaurantIds: string[],
) {
  const menus = await Promise.all(
    restaurantIds.map(async (id) => {
      const menuRef = doc(db, "menus", id);
      const menuDoc = await getDoc(menuRef);
      if (menuDoc.exists()) {
        const data = menuDoc.data();
        if (data.userId === userId) {
          return {
            id,
            menuData: data.menuData,
            restaurantName: data.restaurantName,
          };
        }
      }
      return null;
    }),
  );
  return menus.filter(
    (menu): menu is NonNullable<typeof menu> => menu !== null,
  );
}

// Role management functions
export async function requestRoleChange(
  userId: string,
  requestedRole: "partner" | "validator",
) {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    "user_info.roleRequest": {
      requestedRole,
      status: "pending",
    },
  });
}

export async function getRoleRequests() {
  const usersRef = collection(db, "users");
  const q = query(
    usersRef,
    where("user_info.roleRequest.status", "==", "pending"),
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data().user_info,
  }));
}

export async function updateRoleRequest(userId: string, approved: boolean) {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    const userData = userDoc.data();
    const requestedRole = userData.user_info?.roleRequest?.requestedRole;

    if (approved && requestedRole) {
      await updateDoc(userRef, {
        "user_info.role": requestedRole,
        "user_info.roleRequest": {
          requestedRole: null,
          status: "approved",
        },
      });
    } else {
      await updateDoc(userRef, {
        "user_info.roleRequest": {
          requestedRole: null,
          status: "rejected",
        },
      });
    }
  }
}

export async function saveUserPreferences(
  userId: string,
  preferences: UserPreferences
): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      'preferences': {
        ...preferences,
        lastUpdated: serverTimestamp()
      }
    });
  } catch (error) {
    console.error("Error saving user preferences:", error);
    throw new Error("Failed to save preferences");
  }
}

export async function getUserPreferences(
  userId: string
): Promise<UserPreferences | null> {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.preferences || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    throw new Error("Failed to fetch preferences");
  }
}

export async function getUserRole(userId: string) {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    return userDoc.data().user_info?.role || "user";
  }
  return "user";
}

export async function getHistoricalMenus(
  limitCount: number,
  restaurantName?: string,
  location?: string,
) {
  const menusRef = collection(db, "menus");
  const constraints = [];

  if (restaurantName) {
    constraints.push(where("restaurantName", "==", restaurantName));
  }
  if (location) {
    constraints.push(where("location", "==", location));
  }

  constraints.push(orderBy("timestamp", "desc"));
  constraints.push(limit(limitCount));

  const q = query(menusRef, ...constraints);

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as DocumentData),
  }));
}

export async function getMenuDetails(menuId: string): Promise<MenuDetails> {
  const docRef = doc(db, "menus", menuId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data() as MenuDetails;
    return data;
  } else {
    throw new Error("Menu not found");
  }
}

export async function searchMenus(searchTerm: string): Promise<SearchResult[]> {
  const menusRef = collection(db, "menus");

  const q = query(
    menusRef,
    where("restaurantName", ">=", searchTerm),
    where("restaurantName", "<=", searchTerm + "\uf8ff"),
    limit(10),
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().restaurantName || doc.data().name, // Handle both old and new field names
    address: doc.data().location || doc.data().address, // Handle both old and new field names
    imageUrl: doc.data().imageUrl,
    rating: doc.data().rating,
    county: doc.data().county,
  }));
}

export async function getRecentMenus(userId: string): Promise<SearchResult[]> {
  const menusCollection = collection(db, "menus");
  const q = query(
    menusCollection,
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(5),
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.restaurantName || data.name || "Unknown Restaurant",
      address: data.location || data.address || "Unknown Location",
      imageUrl: data.imageUrl,
      rating: data.rating || 0,
      county: data.county || "",
    };
  });
}

// Get cached image URL
export async function getCachedImageUrl(
  userId: string,
  fileName: string,
): Promise<string | null> {
  try {
    const cacheKey = fileName.split('/').join('_');
    const imageRef = doc(db, "users", userId, "imageCaches", cacheKey);
    const docSnap = await getDoc(imageRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const cacheTime = data.cachedAt?.toMillis() || 0;

      if (Date.now() - cacheTime < CACHE_CONSTANTS.DURATION) {
        // Validate the URL before returning
        if (data.imageUrl && typeof data.imageUrl === 'string') {
          return data.imageUrl;
        }
        // If URL is invalid, delete the cache entry
        await deleteDoc(imageRef);
      } else {
        // Clean up expired cache
        await deleteDoc(imageRef);
      }
    }

    return '/placeholder-restaurant.jpg'; // Return default image path instead of null
  } catch (error) {
    console.error('Error accessing image cache:', error);
    return '/placeholder-restaurant.jpg'; // Return default image path on error
  }
}

// Update saveImageUrlCache to validate URLs before saving
export async function saveImageUrlCache(
  userId: string,
  fileName: string,
  imageUrl: string,
) {
  try {
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Invalid image URL');
    }

    const cacheKey = fileName.split('/').join('_');
    const imageRef = doc(db, "users", userId, "imageCaches", cacheKey);
    
    await setDoc(imageRef, {
      imageUrl,
      originalPath: fileName,
      cachedAt: serverTimestamp(),
      lastValidated: serverTimestamp()
    });
  } catch (error) {
    console.error('Error saving image cache:', error);
    // Don't throw - let the application continue
  }
}

export async function saveMenuImageReferences(
  userId: string,
  restaurantId: string,
  originalImageUrl: string,
  processedImageUrl: string,
) {
  const menuRef = doc(
    db,
    "users",
    userId,
    "restaurants",
    restaurantId,
    "menus",
    new Date().toISOString(),
  );
  await setDoc(menuRef, {
    originalImageUrl,
    processedImageUrl,
    timestamp: new Date(),
  });
}

// Add this consolidated save function to replace the multiple save functions

const dataWithDefaults = (data: Partial<Restaurant>, now: string): DocumentData => ({
  menuCount: 0,
  hasGoogleData: false,
  hasYelpData: false,
  photos: [],
  lastUpdated: serverTimestamp(),
  createdAt: serverTimestamp(),
  ...data
});

export async function saveRestaurant(
  restaurantData: Partial<Restaurant>,
  options: SaveRestaurantOptions = {}
): Promise<SaveRestaurantResult> {
  console.log(`💾 [STORAGE] Saving restaurant data: ${restaurantData.name}`);
  const {
    imageUrl,
    incrementalUpdate = true,
    batch: existingBatch,
    updateCounts = true,
    signal
  } = options;

  if (!restaurantData.id || !restaurantData.county || !restaurantData.townName) {
    throw new Error('Missing required restaurant information (id, county, or townName)');
  }

  try {
    if (signal?.aborted) {
      throw new Error('Operation aborted');
    }

    const batch = existingBatch || writeBatch(db);
    const now = new Date().toISOString();
    
    // References
    const countyRef = doc(db, CONFIG.FIRESTORE.COLLECTIONS.COUNTIES, restaurantData.county);
    const townRef = doc(db, `${CONFIG.FIRESTORE.COLLECTIONS.COUNTIES}/${restaurantData.county}/towns/${restaurantData.townName}`);
    const restaurantRef = doc(db, CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS, restaurantData.id);
    const townRestaurantRef = doc(db, `${CONFIG.FIRESTORE.COLLECTIONS.COUNTIES}/${restaurantData.county}/towns/${restaurantData.townName}/restaurants/${restaurantData.id}`);

    // Check existing data
    const [existingGlobalDoc, existingTownDoc] = await Promise.all([
      getDoc(restaurantRef),
      getDoc(townRestaurantRef)
    ]);

    const isNewGlobal = !existingGlobalDoc.exists();
    const isNewTown = !existingTownDoc.exists();

    // Prepare data
    const firestoreData = dataWithDefaults({
      ...restaurantData,
      ...(imageUrl && { imageUrl })
    }, now);

    // Handle structure creation
    if (isNewTown) {
      const [countyDoc, townDoc] = await Promise.all([
        getDoc(countyRef),
        getDoc(townRef)
      ]);

      if (!countyDoc.exists()) {
        const countyData: RestaurantDocData = {
          name: restaurantData.county,
          restaurantCount: 0,
          lastUpdated: serverTimestamp(),
          createdAt: serverTimestamp()
        };
        (batch as WriteBatch).set(countyRef, countyData);
      }
      
      if (!townDoc.exists()) {
        const townData: RestaurantDocData = {
          name: restaurantData.townName,
          restaurantCount: 0,
          lastUpdated: serverTimestamp(),
          createdAt: serverTimestamp()
        };
        (batch as WriteBatch).set(townRef, townData);
      }
    }

    // Save restaurant data
    const mergeOptions = { merge: incrementalUpdate };
    (batch as WriteBatch).set(restaurantRef, firestoreData, mergeOptions);
    (batch as WriteBatch).set(townRestaurantRef, firestoreData, mergeOptions);

    // Update counts
    if (updateCounts) {
      const updateData: DocumentData = {
        restaurantCount: increment(1),
        lastUpdated: serverTimestamp()
      };

      if (isNewTown) {
        (batch as WriteBatch).set(townRef, updateData, { merge: true });
      }

      if (isNewGlobal) {
        (batch as WriteBatch).set(countyRef, updateData, { merge: true });
      }
    }

    // Commit if we created the batch
    if (!existingBatch) {
      await batch.commit();
    }

    return {
      success: true,
      restaurantId: restaurantData.id,
      updates: (isNewGlobal || isNewTown) ? {
        countyCount: isNewGlobal ? 1 : 0,
        townCount: isNewTown ? 1 : 0
      } : undefined
    };

  } catch (error) {
    console.error('Error saving restaurant:', error);
    return {
      success: false,
      restaurantId: restaurantData.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function saveRestaurantWithYelpData(
  restaurant: Restaurant,
  yelpData: YelpBusiness | null
): Promise<void> {
  if (!yelpData) return;

  const matchScore = calculateMatchScore(restaurant, yelpData);
  
  // Only merge data if there's a good match
  if (matchScore.totalScore > 0.8) {
    const mergedRestaurant: Restaurant = {
      ...restaurant,
      yelpId: yelpData.id,
      yelpRating: yelpData.rating,
      hasYelpData: true,
      // Use Yelp photos for menus if available
      photos: yelpData.photos || restaurant.photos,
      // Prefer Google data for business info
      phone: restaurant.phone || yelpData.display_phone,
      website: restaurant.website || yelpData.url,
      priceLevel: restaurant.priceLevel || yelpData.price_level,
      // Keep track of last sync
      lastYelpSync: new Date().toISOString()
    };

    await saveRestaurant(mergedRestaurant);
  }
}
// Add this helper to transform Google Place data to Restaurant type
export function transformPlaceToRestaurant(
  place: PlaceData,
  county: string,
  townName: string
): Restaurant {
  const now = new Date().toISOString();
  
  return {
    // Essential Information
    id: place.place_id!,
    name: place.name!,
    address: place.formatted_address || place.vicinity || '',
    rating: place.rating || 0,

    // Location Information
    latitude: place.geometry!.location.lat,
    longitude: place.geometry!.location.lng,
    county,
    townName,

    // Menu Information
    menuCount: 0,
    hasMenu: false,

    // Integration Data
    hasGoogleData: true,
    hasYelpData: false,
    placeId: place.place_id!,

    // State Management
    hasDetailsFetched: false,
    createdAt: now,
    lastUpdated: now,

    // Menu and Media fields will be undefined until enhanced
    // Contact & Business Details will be undefined until enhanced
  };
}


// Add this helper function to get a restaurant's data
export async function getRestaurant(restaurantId: string): Promise<Restaurant | null> {
  try {
    const restaurantRef = doc(db, CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS, restaurantId);
    const docSnap = await getDoc(restaurantRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Restaurant;
    }
    return null;
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    return null;
  }
}


export const updateValidationStatus = async (
  menuId: string,
  updates: { [key: string]: boolean },
) => {
  const menuRef = doc(db, "menus", menuId);

  // Ensure the menu exists
  const menuSnap = await getDoc(menuRef);
  if (menuSnap.exists()) {
    await updateDoc(menuRef, updates);
  } else {
    throw new Error("Menu not found");
  }
};

// Function to search for restaurants
export async function searchRestaurants(searchTerm: string): Promise<SearchResult[]> {
  const results = new Map<string, SearchResult>(); // Use Map to prevent duplicates by ID

  try {
    // First, search in restaurants collection
    const restaurantsRef = collection(db, "restaurants");
    const restaurantQuery = query(
      restaurantsRef,
      where("name", ">=", searchTerm.toLowerCase()),
      where("name", "<=", searchTerm.toLowerCase() + "\uf8ff"),
      limit(20)
    );

    // Process restaurant collection results
    const restaurantSnapshot = await getDocs(restaurantQuery);
    restaurantSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      results.set(doc.id, {
        id: doc.id,
        name: data.name,
        address: data.address || "Unknown Location",
        imageUrl: data.imageUrl,
        rating: data.rating,
        county: data.county
      });
    });

    // Then, search in locationCaches collection
    const locationCachesRef = collection(db, CACHE_CONSTANTS.COLLECTION_NAME);
    const locationCacheDocs = await getDocs(locationCachesRef);

    // Process locationCaches results
    for (const cacheDoc of locationCacheDocs.docs) {
      const cacheData = cacheDoc.data();
      if (cacheData.restaurants) {
        cacheData.restaurants
          .filter((restaurant: CachedRestaurant) => 
            restaurant.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .forEach((restaurant: CachedRestaurant) => {
            // Only add if not already present or if present but with less information
            if (!results.has(restaurant.id) || !results.get(restaurant.id)?.county) {
              results.set(restaurant.id, {
                id: restaurant.id,
                name: restaurant.name,
                address: restaurant.address,
                imageUrl: restaurant.imageUrl,
                rating: restaurant.rating,
                county: restaurant.county
              });
            }
          });
      }
    }

    return Array.from(results.values());
  } catch (error) {
    console.error("Error searching restaurants:", error);
    throw error;
  }
}

// Function to get menus by restaurant ID
export async function getMenusByRestaurantId(
  restaurantId: string
): Promise<MenuSummary[]> {
  const menusRef = collection(db, "menus");
  const q = query(menusRef, where("restaurantId", "==", restaurantId));

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      menuName: data.menuName || "Unnamed Menu",
      imageUrl: data.imageUrl || null,
      timestamp: data.timestamp,
    };
  });
}

export async function searchRestaurantsByName(
  searchTerm: string
): Promise<string[]> {
  const restaurantsRef = collection(db, "restaurants");

  const q = query(
    restaurantsRef,
    where("name", ">=", searchTerm),
    where("name", "<=", searchTerm + "\uf8ff"),
    limit(10)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => doc.data().name);
}

export async function updateRestaurantNameInFirestore(
  menuId: string,
  newName: string
) {
  const menuRef = doc(db, "menus", menuId);
  const menuDoc = await getDoc(menuRef);

  if (menuDoc.exists()) {
    const menuData = menuDoc.data();
    const oldRestaurantId = menuData.restaurantId;

    // Create a new restaurant document if it doesn't exist
    const newRestaurantRef = doc(db, "restaurants", newName);
    const newRestaurantDoc = await getDoc(newRestaurantRef);

    if (!newRestaurantDoc.exists()) {
      await setDoc(newRestaurantRef, {
        name: newName,
        address: menuData.menuData.restaurant_info.address,
        // Add other relevant restaurant info
      });
    }

    // Update the menu document
    await updateDoc(menuRef, { 
      restaurantName: newName,
      restaurantId: newRestaurantRef.id
    });

    // Move the menu to the new restaurant's subcollection
    if (oldRestaurantId) {
      const oldRestaurantMenuRef = doc(db, "restaurants", oldRestaurantId, "menus", menuId);
      const newRestaurantMenuRef = doc(db, "restaurants", newName, "menus", menuId);
      const oldMenuDoc = await getDoc(oldRestaurantMenuRef);
      if (oldMenuDoc.exists()) {
        await setDoc(newRestaurantMenuRef, oldMenuDoc.data());
        await deleteDoc(oldRestaurantMenuRef);
      }
    }
  }
}

export async function linkRestaurantToFranchise(
  menuId: string,
  franchiseName: string
) {
  const menuRef = doc(db, "menus", menuId);
  const menuDoc = await getDoc(menuRef);

  if (menuDoc.exists()) {
    const menuData = menuDoc.data();
    const franchiseRef = doc(db, "franchises", franchiseName);

    // Create franchise document if it doesn't exist
    await setDoc(franchiseRef, { name: franchiseName }, { merge: true });

    // Link the restaurant to the franchise
    await updateDoc(menuRef, { franchiseId: franchiseRef.id });

    // Add the restaurant to the franchise's restaurants subcollection
    const franchiseRestaurantRef = doc(franchiseRef, "restaurants", menuData.restaurantId);
    await setDoc(franchiseRestaurantRef, {
      name: menuData.restaurantName,
      address: menuData.menuData.restaurant_info.address,
      // Add other relevant restaurant info
    });
  }
}

export async function getAssociatedFranchiseRestaurants(menuId: string): Promise<string[]> {
  const menuRef = doc(db, "menus", menuId);
  const menuDoc = await getDoc(menuRef);

  if (menuDoc.exists()) {
    const menuData = menuDoc.data();
    if (menuData.franchiseId) {
      const franchiseRef = doc(db, "franchises", menuData.franchiseId);
      const restaurantsSnapshot = await getDocs(collection(franchiseRef, "restaurants"));
      return restaurantsSnapshot.docs.map(doc => doc.data().name);
    }
  }
  return [];
}

export async function checkExistingYelpMenu(
  restaurantId: string,
  yelpId: string
): Promise<boolean> {
  const menusRef = collection(db, "restaurants", restaurantId, "menus");
  const q = query(
    menusRef, 
    where("menuSource", "==", "yelp"),
    where("yelpId", "==", yelpId),
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}




// Updated verifyAndFixRestaurantCount with throttling
export async function verifyAndFixRestaurantCount(
  countyName: string, 
  townName: string,
  forceUpdate: boolean = false
): Promise<void> {
  // Skip verification if too recent unless forced
  const now = Date.now();
  if (!forceUpdate && now - lastVerificationTime < VERIFICATION_INTERVAL) {
    console.log('🔄 Skipping verification - too recent');
    return;
  }
  
  try {
    console.log(`\n🔍 Verifying counts for ${townName}, ${countyName}`);
    lastVerificationTime = now;
    
    const countyRef = doc(db, 'counties', countyName);
    const townRef = doc(countyRef, 'towns', townName);

    // Get all restaurants in a single batch
    const [globalRestaurants, townRestaurants, countyDoc, townDoc] = await Promise.all([
      getDocs(query(
        collection(db, 'restaurants'),
        where('countyName', '==', countyName),
        where('townName', '==', townName)
      )),
      getDocs(collection(townRef, 'restaurants')),
      getDoc(countyRef),
      getDoc(townRef)
    ]);

    const globalCount = globalRestaurants.size;
    const townCount = townRestaurants.size;
    const currentCountyCount = countyDoc.data()?.restaurantCount || 0;
    const currentTownCount = townDoc.data()?.restaurantCount || 0;

    // Only update if counts are different
    if (forceUpdate || globalCount !== currentCountyCount || townCount !== currentTownCount) {
      const batch = writeBatch(db);
      
      if (townCount !== currentTownCount) {
        batch.update(townRef, {
          restaurantCount: townCount,
          lastUpdated: serverTimestamp()
        });
      }

      if (globalCount !== currentCountyCount) {
        batch.update(countyRef, {
          restaurantCount: globalCount,
          lastUpdated: serverTimestamp()
        });
      }

      await batch.commit();
      console.log(`✅ Updated counts - Town: ${townCount}, County: ${globalCount}`);
    } else {
      console.log('✅ Counts are already correct');
    }

  } catch (error) {
    console.error(`❌ Error verifying counts:`, error);
    throw error;
  }
}

// A helper function to create county/town structure if it doesn't exist
export async function ensureCountyTownStructure(countyName: string, townName: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    const countyRef = doc(db, 'counties', countyName);
    const townRef = doc(countyRef, 'towns', townName);

    // First check if they exist
    const [countyDoc, townDoc] = await Promise.all([
      getDoc(countyRef),
      getDoc(townRef)
    ]);

    // Create county if it doesn't exist
    if (!countyDoc.exists()) {
      console.log(`Creating county document for ${countyName}`);
      batch.set(countyRef, {
        name: countyName,
        restaurantCount: 0,
        lastUpdated: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    }

    // Create town if it doesn't exist
    if (!townDoc.exists()) {
      console.log(`Creating town document for ${townName} in ${countyName}`);
      batch.set(townRef, {
        name: townName,
        restaurantCount: 0,
        lastUpdated: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    }

    await batch.commit();
    console.log(`✅ Ensured county/town structure exists for ${countyName}/${townName}`);
  } catch (error) {
    console.error(`❌ Error ensuring county/town structure for ${countyName}/${townName}:`, error);
    throw error;
  }
}


export async function trackApiUsage(
  type: 'google' | 'yelp',
  count: number = 1
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const usageRef = doc(db, 'apiQuotaUsage', today);
  
  try {
    await setDoc(usageRef, {
      [`${type}Calls`]: increment(count),
      lastUpdated: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error tracking API usage:', error);
    throw error;
  }
}

