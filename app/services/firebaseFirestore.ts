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
} from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import geohash from "ngeohash";
import { Menu } from "@/types/menuTypes";

// Interfaces
interface HistoricalMenu {
  id: string;
  restaurantName: string;
  timestamp: string;
  // Add any other properties that your HistoricalMenu might have
}

interface MenuDetails {
  id: string;
  imageUrl: string;
  userId: string;
  menuName: string;
  restaurantName: string;
  location?: string;
  timestamp: string;
  menuData: {
    restaurant_info: {
      name: { original: string; english: string };
      address: { original: string; english: string };
      operating_hours: string;
      phone_number: string;
      website: string;
      social_media: string;
      description: { original: string; english: string };
      additional_notes: string;
    };
    categories: Array<{
      name: { original: string; english: string; pinyin: string };
      items: Array<{
        name: { original: string; english: string; pinyin: string };
        price: { amount: number; currency: string };
        description: { original: string; english: string };
        image_url: string;
        dietary_info: string[];
        sizes: { [key: string]: string };
        popular: boolean;
        chef_recommended: boolean;
        spice_level: string;
        allergy_alert: string;
        upgrades: Array<{ name: string; price: string }>;
        notes: string;
      }>;
    }>;
    other_info: string;
  };
}

interface SearchResult {
  id: string;
  restaurantName: string;
  location: string;
}

const RESTAURANT_DETAILS_COLLECTION = "restaurantDetails";

export async function saveDocumentAiResults(userId: string, imageUrl: string, menu: Menu) {
  const userRef = doc(db, "users", userId);
  const resultsRef = doc(userRef, "documentAiResults", new Date().toISOString());

  await setDoc(resultsRef, {
    imageUrl,
    menu,
    timestamp: new Date().toISOString(),
  });

  // Update the user's latest processing ID
  await updateDoc(userRef, { latestDocumentAiProcessingId: resultsRef.id });
}

export async function getDocumentAiResults(userId: string, processingId?: string) {
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
    console.log('No such document!');
    return null;
  }
}

export async function checkExistingMenuForRestaurant(
  restaurantId: string
): Promise<boolean> {
  const menusRef = collection(db, "restaurants", restaurantId, "menus");
  const q = query(menusRef, orderBy("timestamp", "desc"), limit(1));
  const querySnapshot = await getDocs(q);

  return !querySnapshot.empty;
}

export async function checkExistingMenus(userId: string, fileName: string): Promise<string[]> {
  const userRef = doc(db, "users", userId);
  const resultsCollection = collection(userRef, "vertexAiResults");
  const q = query(resultsCollection, where("menuName", ">=", fileName), where("menuName", "<=", fileName + "\uf8ff"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => doc.data().menuName);
}

export async function getMenuCount(userId: string): Promise<number> {
  const menusCollection = collection(db, "menus");
  const q = query(menusCollection, where("userId", "==", userId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.size;
}

// Function to get menu count for a specific restaurant
export async function getMenuCountForRestaurant(userId: string, restaurantId: string): Promise<number> {
  const menusCollection = collection(db, "menus");
  const q = query(menusCollection, where("userId", "==", userId), where("restaurantId", "==", restaurantId));
  const querySnapshot = await getDocs(q);

  return querySnapshot.size;
}

export function listenToLatestProcessingId(userId: string, callback: (latestId: string) => void) {
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
    throw new Error('No menu ID provided');
  }

  console.log('Fetching menu data for menuId:', menuId);

  const menuRef = doc(db, 'menus', menuId);
  const menuSnap = await getDoc(menuRef);

  if (menuSnap.exists()) {
    const data = menuSnap.data();
    if (data.userId === userId) {
      const menuData =
        typeof data.menuData === 'string' ? JSON.parse(data.menuData) : data.menuData;
      return {
        ...data,
        menuData,
        processingId: menuSnap.id,
        timestamp: data.timestamp
          ? data.timestamp.toDate().toISOString()
          : new Date().toISOString(),
      };
    } else {
      console.error('Unauthorized access to menu data. User ID mismatch.');
      throw new Error('Unauthorized access to menu data');
    }
  } else {
    console.error('No menu data found for menuId:', menuId);
    throw new Error('No menu data found');
  }
}

// Function to get menu data by restaurant name
export async function getVertexAiResultsByRestaurant(userId: string, menuName: string) {
  const menusCollection = collection(db, "menus");
  const q = query(
    menusCollection,
    where("menuName", "==", menuName),
    where("userId", "==", userId)
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      menuData: data.menuData,
      cached: data.cached || false,
      timestamp: data.timestamp
        ? data.timestamp.toDate().toISOString()
        : new Date().toISOString(),
    };
  } else {
    return null;
  }
}

export async function updateVertexAiResults(userId: string, processingId: string, menuData: any) {
  const menuRef = doc(db, "menus", processingId);

  // Ensure the user is authorized to update this menu
  const menuSnap = await getDoc(menuRef);
  if (menuSnap.exists()) {
    const data = menuSnap.data();
    if (data.userId === userId) {
      await updateDoc(menuRef, { menuData });
    } else {
      console.error('Unauthorized access to update menu data. User ID mismatch.');
      throw new Error('Unauthorized access to update menu data');
    }
  } else {
    console.error('No menu data found for processingId:', processingId);
    throw new Error('No menu data found');
  }
}

export async function getVertexAiHistory(userId: string) {
  const menusCollection = collection(db, "menus");
  const q = query(
    menusCollection,
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(10)
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    menuName: doc.data().menuName,
    timestamp: doc.data().timestamp,
  }));
}

// Function to set restaurant details in Firestore
export async function setRestaurantDetails(placeId: string, rating: number, address: string) {
  const restaurantRef = doc(db, RESTAURANT_DETAILS_COLLECTION, placeId);
  await setDoc(restaurantRef, {
    rating,
    address,
    cachedAt: new Date(), // Timestamp when data was cached
  });
}

// Save restaurant details (rating and address) in Firestore
export async function saveRestaurantDetails(restaurantId: string, name: string, rating: number, address: string) {
  const restaurantRef = doc(db, "restaurants", restaurantId);

  await setDoc(restaurantRef, {
    name,
    rating,
    address,
    timestamp: new Date().toISOString(),
  });
}

// Get cached restaurant details from Firestore
export async function getCachedRestaurantDetails(restaurantId: string) {
  const restaurantRef = doc(db, "restaurants", restaurantId);

  const docSnap = await getDoc(restaurantRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    return null;
  }
}

function getLocationCacheKey(lat: number, lng: number): string {
  // Geohash with precision level 5 covers an area of ~4.9km x 4.9km
  return geohash.encode(lat, lng, 5);
}

export async function getCachedRestaurantsForLocation(lat: number, lng: number) {
  const locationKey = getLocationCacheKey(lat, lng);
  console.log(`Cache Key: ${locationKey}`);
  const cacheRef = doc(db, "locationCaches", locationKey);
  const docSnap = await getDoc(cacheRef);

  if (docSnap.exists()) {
    console.log('Cached data found for this location.');
    const data = docSnap.data();
    const cacheTime = data.cachedAt?.toMillis() || 0;
    const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    if (Date.now() - cacheTime < CACHE_DURATION) {
      return data.restaurants;
    } else {
      console.log('Cached data expired. Fetching new data.');
    }
  } else {
    console.log('No cached data for this location.');
  }
  return null;
}

export async function saveCachedRestaurantsForLocation(
  lat: number,
  lng: number,
  restaurants: any[]
) {
  const locationKey = getLocationCacheKey(lat, lng);
  const cacheRef = doc(db, "locationCaches", locationKey);

  await setDoc(cacheRef, {
    restaurants,
    cachedAt: new Date(),
  });
}

// Function to get menus for multiple restaurants
export async function getMenusForRestaurants(userId: string, restaurantIds: string[]) {
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
    })
  );
  return menus.filter((menu): menu is NonNullable<typeof menu> => menu !== null);
}

// Role management functions
export async function requestRoleChange(userId: string, requestedRole: 'partner' | 'validator') {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    'user_info.roleRequest': {
      requestedRole,
      status: 'pending'
    }
  });
}

export async function getRoleRequests() {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("user_info.roleRequest.status", "==", "pending"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data().user_info
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
        'user_info.role': requestedRole,
        'user_info.roleRequest': {
          requestedRole: null,
          status: 'approved'
        }
      });
    } else {
      await updateDoc(userRef, {
        'user_info.roleRequest': {
          requestedRole: null,
          status: 'rejected'
        }
      });
    }
  }
}

export async function getUserRole(userId: string) {
  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    return userDoc.data().user_info?.role || 'user';
  }
  return 'user';
}

export async function getHistoricalMenus(
  limitCount: number,
  restaurantName?: string,
  location?: string
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
  const docRef = doc(db, 'menus', menuId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data() as MenuDetails;
    return data;
  } else {
    throw new Error('Menu not found');
  }
}

export async function searchMenus(searchTerm: string): Promise<SearchResult[]> {
  const menusRef = collection(db, "menus");

  const q = query(
    menusRef,
    where("restaurantName", ">=", searchTerm),
    where("restaurantName", "<=", searchTerm + "\uf8ff"),
    limit(10)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    restaurantName: doc.data().restaurantName,
    location: doc.data().location,
  }));
}

export async function getRecentMenus(userId: string): Promise<SearchResult[]> {
  const menusCollection = collection(db, "menus");
  const q = query(
    menusCollection,
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(5)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      restaurantName: data.restaurantName || 'Unknown Restaurant',
      location: data.location || 'Unknown Location',
    };
  });
}

// Get cached image URL
export async function getCachedImageUrl(userId: string, fileName: string): Promise<string | null> {
  const imageRef = doc(db, "users", userId, "imageCaches", fileName);
  const docSnap = await getDoc(imageRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    const cacheTime = data.cachedAt?.toMillis() || 0;
    const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    if (Date.now() - cacheTime < CACHE_DURATION) {
      return data.imageUrl;
    }
  }

  return null;
}

export async function saveImageUrlCache(userId: string, fileName: string, imageUrl: string) {
  const imageRef = doc(db, "users", userId, "imageCaches", fileName);
  await setDoc(imageRef, {
    imageUrl,
    cachedAt: new Date(),
  });
}

export async function saveMenuImageReferences(userId: string, restaurantId: string, originalImageUrl: string, processedImageUrl: string) {
  const menuRef = doc(db, "users", userId, "restaurants", restaurantId, "menus", new Date().toISOString());
  await setDoc(menuRef, {
    originalImageUrl,
    processedImageUrl,
    timestamp: new Date(),
  });
}

export async function saveRestaurantImageReference(restaurantId: string, imageUrl: string) {
  const restaurantRef = doc(db, "restaurants", restaurantId);
  await updateDoc(restaurantRef, {
    imageUrl,
    imageCachedAt: new Date(),
  });
}

export async function getRestaurantDetails(placeId: string): Promise<any | null> {
  const restaurantRef = doc(db, RESTAURANT_DETAILS_COLLECTION, placeId);
  const docSnap = await getDoc(restaurantRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    const currentTime = Date.now();
    const cacheTime = data.cachedAt?.toMillis() || 0;
    const CACHE_DURATION = 60 * 24 * 60 * 60 * 1000; // 60 days in milliseconds

    if (currentTime - cacheTime < CACHE_DURATION) {
      return data; // Return all data, not just rating and address
    } else {
      console.log('Cached data expired. Consider refreshing the data.');
      return data; // Still return data, but log that it's expired
    }
  }

  return null;
}
