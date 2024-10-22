// app/services/firebaseFirestore.server.ts

import { doc, serverTimestamp, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { processedMenuBucket } from "@/config/googleCloudConfig";

// Server-side function to save Vertex AI results
export async function saveVertexAiResults(
  userId: string,
  menuData: any,
  menuId: string,
  restaurantId: string,
  menuName: string,
  imageUrl: string,
  restaurantName: string,
  yelpId?: string
) {
  const globalMenuRef = doc(db, "menus", menuId);
  const restaurantRef = doc(db, "restaurants", restaurantId);
  const menuRef = doc(restaurantRef, "menus", menuId);
  const userContributionRef = doc(db, "users", userId, "contributions", menuId);
  const timestamp = new Date().toISOString();

  const dataToSave = {
    menuData: menuData,
    timestamp,
    uploadedBy: userId,
    imageUrl,
    processedImageUrl: `gs://${processedMenuBucket.name}/${userId}/${menuId}_processed.png`,
    restaurantName,
    menuSource: yelpId ? 'yelp' : 'user', // Add source tracking
    yelpId, // Add Yelp ID if available
  };

  // Save menu under restaurant
  await setDoc(menuRef, dataToSave, { merge: true });

    // Update restaurant document with Yelp info if available
  if (yelpId) {
    await updateDoc(restaurantRef, {
      yelpId,
      yelpLastUpdated: timestamp,
      menuSource: 'yelp'
    });
  }

 // Save to global menus collection
  await setDoc(
    globalMenuRef,
    {
      ...dataToSave,
      userId,
      menuId,
      restaurantId,
      menuName,
      timestamp: serverTimestamp(),
    },
    { merge: true }
  );

  // Save to user contributions
  await setDoc(
    userContributionRef,
    {
      ...dataToSave,
      userId,
      menuId,
      restaurantId,
      menuName,
      timestamp: serverTimestamp(),
    },
    { merge: true }
  );

  return menuId;
}


