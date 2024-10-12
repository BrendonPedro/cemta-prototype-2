"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  useAuth as useClerkAuth,
  useUser as useClerkUser,
} from "@clerk/nextjs";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { firebaseConfig } from "@/config/firebaseConfig";

// Initialize Firebase if not already initialized
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

interface RoleRequest {
  requestedRole: "partner" | "validator" | null;
  status: "pending" | "approved" | "rejected" | null;
}

interface AuthContextType {
  firebaseToken: string | null;
  loading: boolean;
  error: string | null;
  userRole: "user" | "partner" | "validator" | "admin" | null;
  roleRequest: RoleRequest | null;
  userId: string | null; // Add this line
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<
    "user" | "partner" | "validator" | "admin" | null
  >(null);
  const [roleRequest, setRoleRequest] = useState<RoleRequest | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // Add this line
  const { getToken } = useClerkAuth();
  const { user } = useClerkUser();

  useEffect(() => {
    const authenticateWithFirebase = async () => {
      setLoading(true);
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

        // Fetch user role and role request from Firestore
        if (user) {
          setUserId(user.id); // This sets userId in the context
          const db = getFirestore();
          const userRef = doc(db, "users", user.id);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUserRole(userData.user_info?.role || "user");
            setRoleRequest(userData.user_info?.roleRequest || null);
          }
        }
      } catch (error) {
        console.error("Firebase Authentication Failed", error);
        setError("Failed to authenticate with Firebase");
      } finally {
        setLoading(false);
      }
    };

    authenticateWithFirebase();
  }, [getToken, user]);

  return (
    <AuthContext.Provider
      value={{ firebaseToken, loading, error, userRole, roleRequest, userId }} // Add userId here
    >
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
