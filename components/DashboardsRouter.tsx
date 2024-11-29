/**
 * @file DashboardRouter.tsx
 * @description Router component that handles role-based dashboard navigation and authentication states
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ROLE_ROUTES, AuthContextType } from '@/interfaces/auth';
import Link from "next/link";

/**
 * Main dashboard routing component that handles authentication states
 * and redirects users to appropriate dashboards based on their roles
 */
const DashboardsRouter: React.FC = () => {
  const router = useRouter();
  const { loading, userRole, roleRequest, userId } = useAuth();

  // Handle automatic routing based on user role and authentication state
  useEffect(() => {
    if (!loading && userId && userRole && !roleRequest?.status) {
      const route = ROLE_ROUTES[userRole];
      if (route) {
        router.push(route);
      }
    }
  }, [loading, userId, userRole, roleRequest, router]);

  // Early returns pattern for different states
  if (loading) return <LoadingSpinner />;
  if (!userId) return <SignUpOptions />;
  if (roleRequest?.status === "pending") {
    return <PendingApprovalMessage roleRequest={roleRequest} />;
  }
  
  return <RedirectingMessage />;
};

/**
 * Loading spinner component displayed during authentication checks
 * and data loading states
 */
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-50 to-white">
    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-teal-500"></div>
  </div>
);

/**
 * Sign-up options component displayed for unauthenticated users
 * Provides links to different role-based registration flows
 */
const SignUpOptions: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-white py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-md w-full space-y-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Choose Your Dashboard
        </h2>
      </div>
      <div className="mt-8 space-y-6">
        {[
          { role: "user", label: "Sign Up as User" },
          { role: "partner", label: "Sign Up as Restaurant Partner" },
          { role: "validator", label: "Sign Up as Validator" },
        ].map(({ role, label }) => (
          <Link
            key={role}
            href={`/sign-up?role=${role}`}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  </div>
);

//Props interface for the PendingApprovalMessage component
interface PendingApprovalMessageProps {
  roleRequest: NonNullable<AuthContextType["roleRequest"]>;
}

//Component displayed when a user's role request is pending approval
const PendingApprovalMessage: React.FC<PendingApprovalMessageProps> = ({ roleRequest }) => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-50 to-white">
    <div className="text-center space-y-4">
      <div className="text-2xl font-semibold text-teal-600">
        Your {roleRequest.requestedRole} role request is pending approval
      </div>
      <div className="text-gray-600">
        Please check back later or contact support for status updates
      </div>
    </div>
  </div>
);

// Component displayed during dashboard redirections
const RedirectingMessage: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-50 to-white">
    <div className="text-2xl font-semibold text-teal-600">
      Redirecting to your dashboard...
    </div>
  </div>
);

export default DashboardsRouter;

/**
 * Component Documentation
 * 
 * The DashboardRouter is a critical component that manages role-based routing 
 * and authentication states in the application.
 * 
 * Key Features:
 * - Automatic role-based routing
 * - Authentication state handling
 * - Role request status management
 * - User registration flow
 * 
 * States Handled:
 * 1. Loading: Shows spinner during authentication checks
 * 2. Unauthenticated: Displays sign-up options
 * 3. Pending Role Request: Shows approval waiting message
 * 4. Authenticated: Redirects to role-specific dashboard
 * 
 * Integration Points:
 * - AuthProvider context
 * - Next.js router
 * - Role-based routing configuration
 * 
 * Required Setup:
 * - AuthProvider must be available in the component tree
 * - ROLE_ROUTES configuration in auth interfaces
 * - Proper role-based dashboard routes
 * 
 * Usage:
 * ```tsx
 * // Place in app layout or high-level component
 * <DashboardRouter />
 * ```
 */