// hooks/useClerkFirebaseAuth.ts
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, User } from 'firebase/auth';
import { firebaseConfig } from '@/config/firebaseConfig';

const useClerkFirebaseAuth = () => {
  const { getToken, isSignedIn } = useAuth();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);

  useEffect(() => {
    const initializeFirebase = async () => {
      if (!firebaseApp) {
        const app = initializeApp(firebaseConfig);
        setFirebaseApp(app);
      }
    };

    initializeFirebase();
  }, [firebaseApp]);

  useEffect(() => {
    const signInWithClerk = async () => {
      if (isSignedIn) {
        const token = await getToken({ template: 'integration_firebase' });
        if (token && firebaseApp) {
          const auth = getAuth(firebaseApp);
          try {
            const userCredential = await signInWithCustomToken(auth, token);
            setFirebaseUser(userCredential.user);
          } catch (error) {
            console.error('Error signing in with custom token:', error);
          }
        }
      } else {
        setFirebaseUser(null);
      }
    };

    signInWithClerk();
  }, [getToken, isSignedIn, firebaseApp]);

  return { firebaseUser };
};

export default useClerkFirebaseAuth;
