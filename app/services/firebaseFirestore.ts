// app/services/firebaseFirestore.ts

import { doc, setDoc, getDoc, updateDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { Menu } from "@/types/menuTypes";

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
