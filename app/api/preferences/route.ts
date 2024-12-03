import { NextResponse } from "next/server";
import { UserPreferences } from "@/interfaces/users/user-preferences";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";
import { auth as getAuth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { useAuth } from "@/components/AuthProvider";

export async function POST(request: Request) {
  try {
    const { userId } = getAuth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { preferences } = body as { preferences: UserPreferences };

    // Save to Firestore
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      'preferences': {
        ...preferences,
        updatedAt: serverTimestamp()
      }
    });

    // Update Clerk metadata
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        preferences: {
          likes_spicy: preferences.likes_spicy,
          vegetarian: preferences.vegetarian,
          vegan: preferences.vegan,
          allergens: preferences.allergens,
          dietary_restrictions: preferences.dietary_restrictions,
          favorite_cuisines: preferences.favorite_cuisines,
        },
      },
    });

    return NextResponse.json({ success: true });
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

    // Default preferences
    const defaultPreferences: UserPreferences = {
      allergens: [],
      dietary_restrictions: [],
      likes_spicy: false,
      vegetarian: false,
      vegan: false,
      favorite_cuisines: []
    };

    let preferences = defaultPreferences;

    // If Firestore document exists, use its data
    if (userDoc.exists()) {
      const firestoreData = userDoc.data();
      if (firestoreData.preferences) {
        preferences = {
          ...defaultPreferences,
          ...firestoreData.preferences
        };
      }
    }

    // Get and merge Clerk preferences if they exist
    const user = await clerkClient.users.getUser(userId);
    if (user.publicMetadata?.preferences) {
      preferences = {
        ...preferences,
        ...user.publicMetadata.preferences as UserPreferences
      };
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
