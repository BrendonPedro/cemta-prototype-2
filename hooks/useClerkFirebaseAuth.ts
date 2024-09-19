import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, getDoc, FieldValue, Timestamp } from 'firebase/firestore';
import { firebaseConfig } from '@/config/firebaseConfig';

interface UserData {
  user_info: {
    user_name: string | null;
    user_email: string | undefined;
    user_photo_url: string;
    user_nationality: string;
    user_birthdate: string;
    role: 'user' | 'admin' | 'restaurant-partner' | 'validator';
  };
  preferences: {
    allergens: string[];
    dietary_restrictions: string[];
    likes_spicy: string;
    vegetarian: string;
    vegan: string;
    favorite_cuisines: string[];
  };
  created_at?: FieldValue | Timestamp;
  updated_at: FieldValue;
}

interface PublicUserMetadata {
  nationality?: string;
  birthdate?: string;
  allergens?: string[];
  dietaryRestrictions?: string[];
  likesSpicy?: string;
  vegetarian?: string;
  vegan?: string;
  favoriteCuisines?: string[];
  role?: 'user' | 'admin' | 'restaurant-partner' | 'validator';
}

const useClerkFirebaseAuth = () => {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin' | 'restaurant-partner' | 'validator'>('user');

  useEffect(() => {
    if (!firebaseApp) {
      const app = initializeApp(firebaseConfig);
      setFirebaseApp(app);
    }
  }, [firebaseApp]);

  useEffect(() => {
    const signInWithClerk = async () => {
      if (isSignedIn && user) {
        const token = await getToken({ template: 'integration_firebase' });
        if (token && firebaseApp) {
          const auth = getAuth(firebaseApp);
          try {
            const userCredential = await signInWithCustomToken(auth, token);
            setFirebaseUser(userCredential.user);

            const db = getFirestore(firebaseApp);
            const userRef = doc(db, 'USERS', userCredential.user.uid);

            const userSnapshot = await getDoc(userRef);
            const publicMetadata = user.publicMetadata as PublicUserMetadata;
            
            const role = publicMetadata.role || 'user';
            setUserRole(role);

            let userData: UserData = {
              user_info: {
                user_name: user.username,
                user_email: user.primaryEmailAddress?.emailAddress,
                user_photo_url: user.imageUrl,
                user_nationality: publicMetadata.nationality || '',
                user_birthdate: publicMetadata.birthdate || '',
                role: role,
              },
              preferences: {
                allergens: publicMetadata.allergens || [],
                dietary_restrictions: publicMetadata.dietaryRestrictions || [],
                likes_spicy: publicMetadata.likesSpicy || '',
                vegetarian: publicMetadata.vegetarian || '',
                vegan: publicMetadata.vegan || '',
                favorite_cuisines: publicMetadata.favoriteCuisines || [],
              },
              updated_at: serverTimestamp(),
            };

            if (!userSnapshot.exists()) {
              userData.created_at = serverTimestamp();
            }

            await setDoc(userRef, userData, { merge: true });
          } catch (error) {
            console.error('Error signing in with custom token:', error);
          }
        }
      } else {
        setFirebaseUser(null);
        setUserRole('user');
      }
    };

    signInWithClerk();
  }, [getToken, isSignedIn, firebaseApp, user]);

  return { firebaseUser, userRole };
};

export default useClerkFirebaseAuth;