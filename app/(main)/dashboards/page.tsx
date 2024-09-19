"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import useClerkFirebaseAuth from "@/hooks/useClerkFirebaseAuth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export default function DashboardsRouter() {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const { firebaseUser } = useClerkFirebaseAuth();

  useEffect(() => {
    const routeUser = async () => {
      if (isLoaded && userId && firebaseUser) {
        const db = getFirestore();
        const userRef = doc(db, "USERS", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const userRole = userData.role || "user"; // Default to 'user' if no role is set

          switch (userRole) {
            case "admin":
              router.push("/dashboards/admin");
              break;
            case "restaurant-partner":
              router.push("/dashboards/restaurant-partner");
              break;
            case "validator":
              router.push("/dashboards/validator");
              break;
            default:
              router.push("/dashboards/user/find-restaurants");
              break;
          }
        } else {
          // If user document doesn't exist, default to user dashboard
          router.push("/dashboards/user/find-restaurants");
        }
      }
    };

    routeUser();
  }, [isLoaded, userId, firebaseUser, router]);

  // Show loading state while determining user role
  return <div>Loading...</div>;
}
