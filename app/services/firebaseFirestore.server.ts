// app/services/firebaseFirestore.server.ts

import { doc, serverTimestamp, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { processedMenuBucket } from "@/config/googleCloudConfig";

interface MenuDataToSave {
  menuData: any;
  timestamp: string;
  uploadedBy: string;
  imageUrl: string;
  processedImageUrl: string;
  restaurantName: string;
  menuSource: 'yelp' | 'user';
  yelpId: string | null;
  userId?: string;
  menuId?: string;
  restaurantId?: string;
  menuName?: string;
}

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
  try {
    console.log("Starting saveVertexAiResults with:", {
      userId,
      menuId,
      restaurantId,
      menuName,
      restaurantName,
      yelpId: yelpId || 'not provided'
    });

    const globalMenuRef = doc(db, "menus", menuId);
    const restaurantRef = doc(db, "restaurants", restaurantId);
    const menuRef = doc(restaurantRef, "menus", menuId);
    const userContributionRef = doc(db, "users", userId, "contributions", menuId);
    const timestamp = new Date().toISOString();

    // Create base data object with null for optional fields
    const baseData: MenuDataToSave = {
      menuData,
      timestamp,
      uploadedBy: userId,
      imageUrl: imageUrl || '',
      processedImageUrl: `gs://${processedMenuBucket.name}/${userId}/${menuId}_processed.png`,
      restaurantName: restaurantName || menuName || 'Unnamed Restaurant',
      menuSource: yelpId ? 'yelp' : 'user',
      yelpId: yelpId || null, // Explicitly set to null if undefined
    };

    // Clean the data object by removing any remaining undefined values
    const cleanObject = (obj: any): any => {
      const cleaned = { ...obj };
      Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === undefined) {
          delete cleaned[key];
        } else if (cleaned[key] && typeof cleaned[key] === 'object') {
          cleaned[key] = cleanObject(cleaned[key]);
        }
      });
      return cleaned;
    };

    const cleanedMenuData = cleanObject(baseData);
    console.log("Cleaned menu data:", cleanedMenuData);

    // Save menu under restaurant with cleaned data
    try {
      await setDoc(menuRef, cleanedMenuData, { merge: true });
      console.log("Successfully saved to restaurant/menus");
    } catch (error) {
      console.error("Error saving to restaurant/menus:", error);
      throw error;
    }

    // Update restaurant document with Yelp info if available
    if (yelpId) {
      try {
        await updateDoc(restaurantRef, {
          yelpId,
          yelpLastUpdated: timestamp,
          menuSource: 'yelp'
        });
        console.log("Successfully updated restaurant with Yelp info");
      } catch (error) {
        console.error("Error updating restaurant with Yelp info:", error);
        // Continue execution even if this fails
      }
    }

    // Save to global menus collection
    const globalMenuData = {
      ...cleanedMenuData,
      userId,
      menuId,
      restaurantId,
      menuName: menuName || restaurantName || 'Unnamed Menu',
      timestamp: serverTimestamp(),
    };

    try {
      await setDoc(globalMenuRef, globalMenuData, { merge: true });
      console.log("Successfully saved to global menus");
    } catch (error) {
      console.error("Error saving to global menus:", error);
      throw error;
    }

    // Save to user contributions
    const userContributionData = {
      ...cleanedMenuData,
      userId,
      menuId,
      restaurantId,
      menuName: menuName || restaurantName || 'Unnamed Menu',
      timestamp: serverTimestamp(),
    };

    try {
      await setDoc(userContributionRef, userContributionData, { merge: true });
      console.log("Successfully saved to user contributions");
    } catch (error) {
      console.error("Error saving to user contributions:", error);
      throw error;
    }

    console.log("All save operations completed successfully");
    return menuId;

  } catch (err) {
    const error = err instanceof Error ? err : new Error('An unknown error occurred');
    console.error("Error in saveVertexAiResults:", error.message);
    throw new Error(`Failed to save Vertex AI results: ${error.message}`);
  }
}
// Helper function to check if a menu exists
export async function checkMenuExists(menuId: string): Promise<boolean> {
  try {
    const menuRef = doc(db, "menus", menuId);
    const menuDoc = await getDoc(menuRef);
    return menuDoc.exists();
  } catch (error) {
    console.error("Error checking menu existence:", error);
    return false;
  }
}