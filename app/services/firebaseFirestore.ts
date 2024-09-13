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

export async function saveVertexAiResults(userId: string, menuData: any, menuName: string) {
  const userRef = doc(db, "users", userId);
  const resultsRef = doc(collection(userRef, "vertexAiResults"));
  
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
      menuName,
      timestamp: new Date().toISOString(),
    });

    // Update the user's latest processing ID
    await updateDoc(userRef, { latestVertexAiProcessingId: resultsRef.id });

    return resultsRef.id; // Return the new processing ID
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

