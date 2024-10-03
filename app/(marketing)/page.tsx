"use client";

import { useEffect, useState } from "react";
import { Loader } from "lucide-react";
import {
  ClerkLoaded,
  ClerkLoading,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { initializeApp, getApps, getApp } from "firebase/app";
import { firebaseConfig } from "@/config/firebaseConfig";
import DynamicWelcomeMessage from "@/components/dynamicWelcomeMessage";

const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();
const db = getFirestore(firebaseApp);

export default function Home() {
  const { firebaseToken, userRole, loading } = useAuth();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (firebaseToken) {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, "users", user.uid);
          const userSnapshot = await getDoc(userRef);

          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            setUsername(userData?.user_info?.user_name || null);
          }
        }
      }
    };

    fetchUserData();
  }, [firebaseToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="h-8 w-8 text-customTeal animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12">
      <div className="text-center mb-12">
        <h1 className="cemta-title font-bold text-6xl md:text-9xl bg-clip-text text-transparent bg-gradient-to-r from-customTeal to-customBlack">
          CEMTA
        </h1>
        <p className="text-3xl md:text-4xl font-bold text-gray-700 mt-4 max-w-2xl mx-auto">
          <em>Revolutionizing the Dining Experience</em>
        </p>
      </div>

      <div className="flex flex-col items-center gap-y-6 max-w-md w-full bg-transparent p-8 rounded-lg">
        <ClerkLoading>
          <Loader className="h-8 w-8 text-customTeal animate-spin" />
        </ClerkLoading>
        <ClerkLoaded>
          <SignedOut>
            <SignUpButton mode="modal">
              <Button size="lg" variant="nextButton" className="w-auto">
                Get Started
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button size="lg" variant="nextButton2" className="w-auto">
                I already have an account
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Button size="lg" variant="nextButton2" className="w-full" asChild>
              <Link
                href={
                  userRole === "admin"
                    ? "/dashboards/admin"
                    : userRole === "partner"
                    ? "/dashboards/partner"
                    : userRole === "validator"
                    ? "/dashboards/validator"
                    : "/dashboards/user"
                }
              >
                Continue to{" "}
                {userRole
                  ? userRole.charAt(0).toUpperCase() + userRole.slice(1)
                  : "User"}{" "}
                Dashboard
              </Link>
            </Button>
          </SignedIn>
        </ClerkLoaded>
      </div>

      {username && (
        <div className="mt-8 text-center">
          <DynamicWelcomeMessage username={username} />
        </div>
      )}
    </div>
  );
}
