"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import useClerkFirebaseAuth from "@/hooks/useClerkFirebaseAuth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import Link from "next/link";

const DashboardsRouter: React.FC = () => {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();
  const {
    firebaseUser,
    userRole: clerkUserRole,
    roleRequest: clerkRoleRequest,
  } = useClerkFirebaseAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleRequest, setRoleRequest] = useState<{
    requestedRole: string | null;
    status: "pending" | "approved" | "rejected" | null;
  } | null>(null);

  useEffect(() => {
    const routeUser = async () => {
      if (isLoaded && userId && firebaseUser) {
        // If we have the role from useClerkFirebaseAuth, use it
        if (clerkUserRole) {
          setUserRole(clerkUserRole);
        } else {
          // Fallback to fetching from Firestore
          const db = getFirestore();
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUserRole(userData.user_info?.role || "user");
          } else {
            setUserRole("user");
          }
        }

        // Set role request from useClerkFirebaseAuth
        setRoleRequest(clerkRoleRequest);
      } else if (isLoaded && !userId) {
        setUserRole(null);
        setRoleRequest(null);
      }
    };

    routeUser();
  }, [isLoaded, userId, firebaseUser, clerkUserRole, clerkRoleRequest]);

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  if (!userId) {
    return <SignUpOptions />;
  }

  if (roleRequest && roleRequest.status === "pending") {
    return <PendingApprovalMessage />;
  }

  if (userRole) {
    switch (userRole) {
      case "admin":
        router.push("/dashboards/admin");
        break;
      case "partner":
        router.push("/dashboards/restaurant-partner");
        break;
      case "validator":
        router.push("/dashboards/validator");
        break;
      default:
        router.push("/dashboards/user/find-restaurants");
        break;
    }
    return <RedirectingMessage />;
  }

  return <LoadingSpinner />;
};

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-50 to-white">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-teal-500"></div>
  </div>
);

const SignUpOptions: React.FC = () => (
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

const PendingApprovalMessage: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-50 to-white">
    <div className="text-2xl font-semibold text-teal-600">
      Your role change request is pending approval. Please check back later.
    </div>
  </div>
);

const RedirectingMessage: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-50 to-white">
    <div className="text-2xl font-semibold text-teal-600">Redirecting...</div>
  </div>
);

export default DashboardsRouter;
