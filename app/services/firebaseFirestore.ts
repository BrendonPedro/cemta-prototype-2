// app/services/firebaseFirestore.ts

import { doc, setDoc, getDoc, updateDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { Menu } from "@/types/menuTypes";

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
export async function saveVertexAiResults(userId: string, menuData: any, restaurantId: string, restaurantName: string) {
  const userRef = doc(db, "users", userId);
  const resultsRef = doc(userRef, "vertexAiResults", restaurantId);
  
  try {
    // Check if the user document exists
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // If the user document doesn't exist, create it
      await setDoc(userRef, { createdAt: new Date().toISOString() });
    }
    
    // Now save the Vertex AI results
    await setDoc(resultsRef, {
      menuData: JSON.stringify(menuData), // Stringify the menuData
      restaurantName,
      timestamp: new Date().toISOString(),
    });

    // Update the user's latest processing ID
    await updateDoc(userRef, { latestVertexAiProcessingId: restaurantId });

    return restaurantId; // Return the restaurant ID
  } catch (error) {
    console.error("Error saving Vertex AI results:", error);
    throw error;
  }
}


export async function getVertexAiResults(userId: string, processingId: string) {
  const userRef = doc(db, "users", userId);
  const resultsRef = doc(userRef, "vertexAiResults", processingId);
  const docSnap = await getDoc(resultsRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      menuData: JSON.parse(data.menuData), // Parse the stringified menuData
    };
  } else {
    console.log('No such document!');
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
    const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

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
  // Round the coordinates to 3 decimal places to group nearby locations
  return `${lat.toFixed(3)}_${lng.toFixed(3)}`;
}

export async function getCachedRestaurantsForLocation(lat: number, lng: number) {
  const locationKey = getLocationCacheKey(lat, lng);
  const cacheRef = doc(db, "locationCaches", locationKey);
  const docSnap = await getDoc(cacheRef);

 if (docSnap.exists()) {
    const data = docSnap.data();
    const cacheTime = data.cachedAt?.toMillis() || 0;
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    if (Date.now() - cacheTime < CACHE_DURATION) {
      return data.restaurants;
    }
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