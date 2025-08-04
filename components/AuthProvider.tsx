"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { useAuth as useClerkAuth, useUser as useClerkUser } from "@clerk/nextjs";
import { signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp, type DocumentSnapshot } from "firebase/firestore";
import { auth, db } from "@/config/firebaseConfig";
import { 
  AuthContextType, 
  RoleRequest, 
  UserRoleType,
  UserData 
} from '@/interfaces/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRoleType>(null);
  const [roleRequest, setRoleRequest] = useState<RoleRequest | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const { getToken } = useClerkAuth();
  const { user } = useClerkUser();

  const fetchUserData = async (userId: string) => {
    try {
      setUserId(userId);
      const userRef = doc(db, "users", userId);
      const userSnap: DocumentSnapshot = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data() as UserData;
        setUserRole(userData.user_info?.role || "user");
        setRoleRequest(userData.user_info?.roleRequest || null);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("Failed to fetch user data");
    }
  };

  const updateUserRole = useCallback(async (newRole: UserRoleType) => {
    if (!userId) return;
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        'user_info.role': newRole,
        updatedAt: serverTimestamp()
      });
      setUserRole(newRole);
    } catch (error) {
      setError("Failed to update user role");
      console.error("Error updating user role:", error);
    }
  }, [userId]);

  const getValidFirebaseToken = useCallback(async () => {
    try {
      if (!user) return null;
      const customToken = await getToken({
        template: "integration_firebase",
      });
      if (!customToken) return null;
      const userCredential = await signInWithCustomToken(auth, customToken);
      const newToken = await userCredential.user.getIdToken();
      setFirebaseToken(newToken);
      return newToken;
    } catch (error) {
      console.error("Error refreshing token:", error);
      setError("Failed to refresh authentication token");
      return null;
    }
  }, [getToken, user]);

  const makeAuthenticatedRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      // First attempt with current token
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${firebaseToken}`,
        },
      });
      // If token expired, get new token and retry once
      if (response.status === 401) {
        const newToken = await getValidFirebaseToken();
        if (!newToken) throw new Error('Failed to refresh token');
        // Retry with new token
        return await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
          },
        });
      }
      return response;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }, [firebaseToken, getValidFirebaseToken]);

  useEffect(() => {
    const authenticateWithFirebase = async () => {
      setLoading(true);

      try {
        if (!user) {
          setFirebaseToken(null);
          setUserRole(null);
          setRoleRequest(null);
          setUserId(null);
          return;
        }

        const customToken = await getToken({
          template: "integration_firebase",
        });

        if (!customToken) {
          throw new Error("Authentication failed: No custom token received");
        }

        const userCredential = await signInWithCustomToken(auth, customToken);
        const idToken = await userCredential.user.getIdToken();
        setFirebaseToken(idToken);

        await fetchUserData(user.id);

      } catch (error) {
        console.error("Firebase Authentication Failed:", error);
        if (user) {
          setError("Failed to authenticate with Firebase");
        }
      } finally {
        setLoading(false);
      }
    };

    authenticateWithFirebase();
  }, [getToken, user]);

  const authContextValue = useMemo(
    () => ({
      firebaseToken,
      loading,
      error,
      userRole,
      roleRequest,
      userId,
      updateUserRole,
      getValidFirebaseToken,
      makeAuthenticatedRequest
    }),
    [
      firebaseToken,
      loading,
      error,
      userRole,
      roleRequest,
      userId,
      updateUserRole,
      getValidFirebaseToken,
      makeAuthenticatedRequest
    ]
  );

  if (error && user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Authentication Error. Please try again.</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error(
      "useAuth must be used within an AuthProvider. " +
      "Please check if AuthProvider is wrapping this component."
    );
  }
  
  return context;
};