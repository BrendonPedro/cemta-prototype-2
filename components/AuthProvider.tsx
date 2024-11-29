/**
 * @file components/AuthProvider.tsx
 * @description Authentication context provider that integrates Clerk with Firebase
 * and manages user roles and permissions.
 */

"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
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

// Create Authentication Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// main component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // State Management
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRoleType>(null);
  const [roleRequest, setRoleRequest] = useState<RoleRequest | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // External Authentication Hooks
  const { getToken } = useClerkAuth();
  const { user } = useClerkUser();

  /**
   * Fetches user data from Firestore and updates local state
   * @param userId - The unique identifier for the user
   */
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

  /**
   * Updates user role in Firestore and local state
   * @param newRole - The new role to be assigned to the user
   */
  const updateUserRole = async (newRole: UserRoleType) => {
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
  };

  /**
   * Firebase Authentication Effect
   * Handles authentication flow and user data fetching
   */
  useEffect(() => {
    const authenticateWithFirebase = async () => {
      setLoading(true);

      try {
        // Reset state if no user
        if (!user) {
          setFirebaseToken(null);
          setUserRole(null);
          setRoleRequest(null);
          setUserId(null);
          return;
        }

        // Get Clerk token and authenticate with Firebase
        const customToken = await getToken({
          template: "integration_firebase",
        });

        if (!customToken) {
          throw new Error("Authentication failed: No custom token received");
        }

        // Perform Firebase authentication using pre-initialized auth instance
        const userCredential = await signInWithCustomToken(auth, customToken);
        const idToken = await userCredential.user.getIdToken();
        setFirebaseToken(idToken);

        // Fetch user data
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

  // Memoize context value to prevent unnecessary rerenders
  const authContextValue = useMemo(
    () => ({
      firebaseToken,
      loading,
      error,
      userRole,
      roleRequest,
      userId,
      updateUserRole
    }),
    [firebaseToken, loading, error, userRole, roleRequest, userId]
  );

  // Error boundary for authenticated users
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

/**
 * Custom hook to access authentication context
 * @throws {Error} If used outside of AuthProvider
 * @returns {AuthContextType} The authentication context value
 */
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

/**
 * @fileoverview
 * This AuthProvider component serves as a crucial authentication bridge between 
 * Clerk.js and Firebase, while also managing user roles and permissions.
 * 
 * Key Features:
 * - Integrates Clerk.js with Firebase Authentication
 * - Manages user roles and role request status
 * - Provides authentication context for the entire application
 * - Handles error states and loading states
 * 
 * Integration Points:
 * - Clerk.js (@clerk/nextjs)
 * - Firebase Authentication
 * - Firestore for user data
 * 
 * Usage:
 * Wrap the application with AuthProvider at a high level in the component tree
 * to provide authentication context to all child components.
 */