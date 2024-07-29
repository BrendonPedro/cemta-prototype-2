// components/ProfileUpdateHandler.tsx
import { useAuth, useUser } from "@clerk/nextjs";
import { useState, useEffect, useCallback } from "react";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "@/config/firebaseConfig";
import { initializeApp } from "firebase/app";

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const ProfileUpdateHandler = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const updateFirestoreProfile = useCallback(async () => {
    if (user) {
      setLoading(true);
      const userRef = doc(db, "USERS", user.id);

      const userData = {
        user_info: {
          user_name: user.username,
          user_email: user.primaryEmailAddress?.emailAddress,
          user_photo_url: user.imageUrl,
          user_nationality: user.publicMetadata?.nationality || "",
          user_birthdate: user.publicMetadata?.birthdate || "",
        },
        preferences: {
          allergens: user.publicMetadata?.allergens || [],
          dietary_restrictions: user.publicMetadata?.dietaryRestrictions || [],
          likes_spicy: user.publicMetadata?.likesSpicy || "",
          vegetarian: user.publicMetadata?.vegetarian || "",
          vegan: user.publicMetadata?.vegan || "",
          favorite_cuisines: user.publicMetadata?.favoriteCuisines || [],
        },
        updated_at: serverTimestamp(),
      };

      await setDoc(userRef, userData, { merge: true });
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    updateFirestoreProfile();
  }, [user, updateFirestoreProfile]);

  return (
    <div>{loading ? <p>Updating profile...</p> : <p>Profile updated!</p>}</div>
  );
};

export default ProfileUpdateHandler;
