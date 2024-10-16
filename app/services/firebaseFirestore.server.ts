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
) {
  const globalMenuRef = doc(db, "menus", menuId);
  const restaurantRef = doc(db, "restaurants", restaurantId);
  const menuRef = doc(restaurantRef, "menus", menuId);
  const userContributionRef = doc(db, "users", userId, "contributions", menuId);
  const timestamp = new Date().toISOString();

  const dataToSave = {
    menuData: JSON.stringify(menuData),
    timestamp,
    uploadedBy: userId,
    originalImageUrl: imageUrl,
    processedImageUrl: `gs://${processedMenuBucket.name}/${userId}/${menuId}_processed.png`,
    restaurantName,
  };

  // Save menu under restaurant
  await setDoc(menuRef, dataToSave, { merge: true });

  // Also save menu under 'menus/{menuId}' for consistency
  await setDoc(
    globalMenuRef,
    {
      userId,
      menuData,
      menuId,
      restaurantId,
      menuName,
      imageUrl,
      timestamp: serverTimestamp(),
      restaurantName,
    },
    { merge: true },
  );

  // Save user contributions
  await setDoc(
    userContributionRef,
    {
      userId,
      menuData,
      menuId,
      restaurantId,
      menuName,
      imageUrl,
      timestamp: serverTimestamp(),
      restaurantName,
    },
    { merge: true },
  );

  return menuId;
}


