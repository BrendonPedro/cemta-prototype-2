import { NextResponse } from "next/server";
import { UserPreferences } from "@/interfaces/users/user-preferences";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { auth as getAuth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";

const DEFAULT_PREFERENCES: UserPreferences = {
  allergens: [],
  dietary_restrictions: [],
  spice_level: "medium",
  vegetarian: false,
  vegan: false,
  favorite_cuisines: [],
  updatedAt: null
};

export async function POST(request: Request) {
  try {
    const { userId } = getAuth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { preferences } = body as { preferences: UserPreferences };

    // Validate preferences data
    const validatedPreferences = {
      ...DEFAULT_PREFERENCES,
      ...preferences,
      updatedAt: serverTimestamp()
    };

    // Save to Firestore with complete preference object
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      'preferences': validatedPreferences
    });

    // Update Clerk metadata with essential preferences
    // Note: Clerk has storage limitations, so we only store critical preferences
    const clerkPreferences = {
      spice_level: preferences.spice_level,
      vegetarian: preferences.vegetarian,
      vegan: preferences.vegan,
      allergens: preferences.allergens,
      dietary_restrictions: preferences.dietary_restrictions,
      favorite_cuisines: preferences.favorite_cuisines?.slice(0, 10) // Limit to top 10 cuisines
    };

    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        preferences: clerkPreferences,
      },
    });

    return NextResponse.json({ 
      success: true,
      preferences: validatedPreferences 
    });
  } catch (error) {
    console.error("Error saving preferences:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { userId } = getAuth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get from Firestore
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    let preferences = { ...DEFAULT_PREFERENCES };

    // If Firestore document exists, use its data
    if (userDoc.exists()) {
      const firestoreData = userDoc.data();
      if (firestoreData.preferences) {
        preferences = {
          ...preferences,
          ...firestoreData.preferences,
          // Ensure boolean values are properly typed
          vegetarian: Boolean(firestoreData.preferences.vegetarian),
          vegan: Boolean(firestoreData.preferences.vegan),
        };
      }
    }

    // Get and merge Clerk preferences if they exist
    try {
      const user = await clerkClient.users.getUser(userId);
      if (user.publicMetadata?.preferences) {
        const clerkPreferences = user.publicMetadata.preferences as Partial<UserPreferences>;
        
        // Merge while preserving Firestore data as source of truth
        preferences = {
          ...preferences,
          ...clerkPreferences,
          // Preserve arrays from Firestore if they exist
          allergens: preferences.allergens?.length ? preferences.allergens : clerkPreferences.allergens || [],
          dietary_restrictions: preferences.dietary_restrictions?.length ? 
            preferences.dietary_restrictions : clerkPreferences.dietary_restrictions || [],
          favorite_cuisines: preferences.favorite_cuisines?.length ? 
            preferences.favorite_cuisines : clerkPreferences.favorite_cuisines || []
        };
      }
    } catch (clerkError) {
      console.error("Error fetching Clerk data:", clerkError);
      // Continue with Firestore data if Clerk fails
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}