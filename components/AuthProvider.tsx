"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { firebaseConfig } from "@/config/firebaseConfig";

// Initialize Firebase app if not already initialized
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

interface AuthContextType {
  firebaseToken: string | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useClerkAuth();

  useEffect(() => {
    const authenticateWithFirebase = async () => {
      try {
        const customToken = await getToken({
          template: "integration_firebase",
        });
        if (!customToken) {
          throw new Error("Authentication failed. Could not get custom token");
        }

        const auth = getAuth();
        const userCredential = await signInWithCustomToken(auth, customToken);
        const idToken = await userCredential.user.getIdToken();
        setFirebaseToken(idToken);
        console.log("Firebase Authentication Successful");
      } catch (error) {
        console.error("Firebase Authentication Failed", error);
        setError("Failed to authenticate with Firebase");
      } finally {
        setLoading(false);
      }
    };

    authenticateWithFirebase();
  }, [getToken]);

  return (
    <AuthContext.Provider value={{ firebaseToken, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
