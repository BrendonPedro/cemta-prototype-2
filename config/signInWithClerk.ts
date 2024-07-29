// signInWithClerk.ts
import { useAuth } from "@clerk/nextjs";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { useEffect } from "react";
import { firebaseConfig } from '@/config/firebaseConfig';
import { initializeApp } from 'firebase/app';

export const useSignInWithClerk = () => {
  const { getToken } = useAuth();

  useEffect(() => {
    const signInWithClerk = async () => {
      const token = await getToken({ template: "integration_firebase" });
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const userCredentials = await signInWithCustomToken(auth, token || "");
      console.log("Firebase user:", userCredentials.user);
    };

    signInWithClerk();
  }, [getToken]);
};


