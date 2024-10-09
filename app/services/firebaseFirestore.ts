// app/services/firebaseFirestore.ts

import { doc, setDoc, getDoc, updateDoc, collection, query, where, orderBy, limit, getDocs, onSnapshot, getFirestore, DocumentData } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { Menu, MenuItem } from "@/types/menuTypes";
import geohash from 'ngeohash';

// Add these interfaces at the top of the file
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

export async function checkExistingMenus(userId: string, fileName: string): Promise<string[]> {
  const userRef = doc(db, "users", userId);
  const resultsCollection = collection(userRef, "vertexAiResults");
  const q = query(resultsCollection, where("menuName", ">=", fileName), where("menuName", "<=", fileName + "\uf8ff"));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => doc.data().menuName);
}

export async function getMenuCount(userId: string): Promise<number> {
  const userRef = doc(db, "users", userId);
  const resultsCollection = collection(userRef, "vertexAiResults");
  const querySnapshot = await getDocs(resultsCollection);

  return querySnapshot.size;
}


// Add this new function to get menu count for a specific restaurant
export async function getMenuCountForRestaurant(userId: string, restaurantId: string): Promise<number> {
  const userRef = doc(db, "users", userId);
  const menuRef = doc(userRef, "vertexAiResults", restaurantId);
  const menuDoc = await getDoc(menuRef);

  return menuDoc.exists() ? 1 : 0;
}

// Modify the saveVertexAiResults function to use restaurantId
export async function saveVertexAiResults(
  userId: string, 
  menuData: any, 
  menuName: string, 
  restaurantName: string | undefined
) {
  const userRef = doc(db, "users", userId);
  const resultsRef = doc(userRef, "vertexAiResults", menuName);
  
  const timestamp = new Date().toISOString();

  try {
    const dataToSave: {
      menuData: string;
      timestamp: string;
      cached: boolean;
      restaurantName?: string;
    } = {
    menuData: typeof menuData === 'string' ? menuData : JSON.stringify(menuData),
    timestamp,
    cached: true,
  };

    // Only add restaurantName if it's defined
    if (restaurantName !== undefined) {
      dataToSave.restaurantName = restaurantName;
    }

    await setDoc(resultsRef, dataToSave, { merge: true });

    await updateDoc(userRef, { latestVertexAiProcessingId: menuName });

    return menuName;
  } catch (error) {
    console.error("Error saving Vertex AI results:", error);
    throw error;
  }
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

export async function getVertexAiResults(userId: string, processingId?: string): Promise<MenuDetails | null> {
  const userRef = doc(db, "users", userId);
  let resultsRef;

  if (processingId) {
    resultsRef = doc(userRef, "vertexAiResults", processingId);
  } else {
    const userDoc = await getDoc(userRef);
    const latestProcessingId = userDoc.data()?.latestVertexAiProcessingId;
    if (!latestProcessingId) {
      return null;
    }
    resultsRef = doc(userRef, "vertexAiResults", latestProcessingId);
  }

  const docSnap = await getDoc(resultsRef);

  if (docSnap.exists()) {
    const data = docSnap.data() as MenuDetails;
    // Ensure menuData is parsed if it's stored as a string
    if (typeof data.menuData === 'string') {
      data.menuData = JSON.parse(data.menuData);
    }
    // Ensure categories always exists
    if (!data.menuData.categories) {
      data.menuData.categories = [];
    }
    return data;
  } else {
    console.log('No such document!');
    return null;
  }
}

// New function to get menu data by restaurant name
export async function getVertexAiResultsByRestaurant(userId: string, restaurantName: string) {
  const userRef = doc(db, "users", userId);
  const resultsCollection = collection(userRef, "vertexAiResults");
  const q = query(resultsCollection, where("restaurantName", "==", restaurantName));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    return {
      ...data,
      menuData: JSON.parse(data.menuData),
      cached: data.cached || false,
      processingId: docSnap.id,
      timestamp: data.timestamp || new Date().toISOString(),
    };
  } else {
    return null;
  }
}

export async function updateVertexAiResults(userId: string, processingId: string, menuData: any) {
  const userRef = doc(db, "users", userId);
  const resultsRef = doc(userRef, "vertexAiResults", processingId);
  
  await updateDoc(resultsRef, { menuData });
}

export async function getVertexAiHistory(userId: string) {
  const userRef = doc(db, "users", userId);
  const resultsCollection = collection(userRef, "vertexAiResults");
  const q = query(resultsCollection, orderBy("timestamp", "desc"), limit(10));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    menuName: doc.data().menuName,
    timestamp: doc.data().timestamp,
  }));
}

// New: Function to get restaurant details from Firestore
export async function getRestaurantDetails(placeId: string): Promise<{ rating: number; address: string } | null> {
  const restaurantRef = doc(db, RESTAURANT_DETAILS_COLLECTION, placeId);
  const docSnap = await getDoc(restaurantRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    const currentTime = Date.now();
    const cacheTime = data.cachedAt?.toMillis() || 0;
    const CACHE_DURATION = 60 * 24 * 60 * 60 * 1000; // 60 days in milliseconds

    if (currentTime - cacheTime < CACHE_DURATION) {
      return { rating: data.rating, address: data.address };
    }
  }

  return null;
}

// New: Function to set restaurant details in Firestore
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
    const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in miiliseconds

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

// Added this function to get menus for multiple restaurants
export async function getMenusForRestaurants(userId: string, restaurantIds: string[]) {
  const userRef = doc(db, "users", userId);
  const menus = await Promise.all(
    restaurantIds.map(async (id) => {
      const menuRef = doc(userRef, "vertexAiResults", id);
      const menuDoc = await getDoc(menuRef);
      if (menuDoc.exists()) {
        const data = menuDoc.data();
        return {
          id,
          menuData: JSON.parse(data.menuData),
          restaurantName: data.restaurantName,
        };
      }
      return null;
    })
  );
  return menus.filter((menu): menu is NonNullable<typeof menu> => menu !== null);
}

// New functions for role management

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

export async function getHistoricalMenus(limitCount: number, restaurantName?: string, location?: string) {
  const menusRef = collection(db, 'menus');
  let q = query(menusRef);

  if (restaurantName) {
    q = query(q, where('restaurantName', '==', restaurantName));
  }
  if (location) {
    q = query(q, where('location', '==', location));
  }

  q = query(q, orderBy('timestamp', 'desc'), limit(limitCount));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as DocumentData)
  }));
}

export async function getMenuDetails(menuId: string): Promise<MenuDetails> {
  const docRef = doc(db, 'processedMenus', menuId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data() as MenuDetails;
    return data;
  } else {
    throw new Error('Menu not found');
  }
}

export async function searchMenus(searchTerm: string): Promise<SearchResult[]> {
  const menusRef = collection(db, 'menus');
  const q = query(
    menusRef,
    where('restaurantName', '>=', searchTerm),
    where('restaurantName', '<=', searchTerm + '\uf8ff'),
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
  const userRef = doc(db, "users", userId);
  const menusRef = collection(userRef, "vertexAiResults");
  const q = query(menusRef, orderBy("timestamp", "desc"), limit(5));
  
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