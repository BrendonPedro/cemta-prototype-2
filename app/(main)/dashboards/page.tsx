"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import useClerkFirebaseAuth from "@/hooks/useClerkFirebaseAuth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import Link from "next/link";

export default function DashboardsRouter() {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const { firebaseUser } = useClerkFirebaseAuth();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const routeUser = async () => {
      if (isLoaded && userId && firebaseUser) {
        const db = getFirestore();
        const userRef = doc(db, "USERS", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const role = userData.role || "user";
          setUserRole(role);
        } else {
          setUserRole("user");
        }
      } else if (isLoaded && !userId) {
        setUserRole(null);
      }
    };

    routeUser();
  }, [isLoaded, userId, firebaseUser]);

  if (!isLoaded)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-50 to-white">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Choose Your Dashboard
            </h2>
          </div>
          <div className="mt-8 space-y-6">
            <Link
              href="/sign-up?role=user"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Sign Up as User
            </Link>
            <Link
              href="/sign-up?role=partner"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Sign Up as Restaurant Partner
            </Link>
            <Link
              href="/sign-up?role=validator"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Sign Up as Validator
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (userRole) {
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-50 to-white">
        <div className="text-2xl font-semibold text-teal-600">
          Redirecting...
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-50 to-white">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-teal-500"></div>
    </div>
  );
}
// //Try 

// "use client";

// import { useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { useAuth } from "@clerk/nextjs";
// import useClerkFirebaseAuth from "@/hooks/useClerkFirebaseAuth";

// export default function DashboardsRouter() {
//   const router = useRouter();
//   const { isLoaded, userId } = useAuth();
//   const { firebaseUser, userRole } = useClerkFirebaseAuth();

//   useEffect(() => {
//     if (isLoaded && userId && firebaseUser) {
//       switch (userRole) {
//         case "admin":
//           router.push("/dashboards/admin");
//           break;
//         case "restaurant-partner":
//           router.push("/dashboards/restaurant-partner");
//           break;
//         case "validator":
//           router.push("/dashboards/validator");
//           break;
//         default:
//           router.push("/dashboards/user/find-restaurants");
//           break;
//       }
//     } else if (isLoaded && !userId) {
//       router.push("/sign-up");
//     }
//   }, [isLoaded, userId, firebaseUser, userRole, router]);

//   return <div>Loading...</div>;
// }