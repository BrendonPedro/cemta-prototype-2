// app/(main)/dashboards/admin/database-building/page.tsx
"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import DatabaseBuildingMonitor from "@/components/DatabaseBuildingMonitor";

export default function DatabaseBuildingPage() {
  const { loading, userRole } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-customTeal"></div>
      </div>
    );
  }

  if (userRole !== "admin") {
    router.push("/dashboards");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold text-red-600">
          Unauthorized access. Redirecting...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-gray-800">
        Database Building Control Panel
      </h1>
      <DatabaseBuildingMonitor /> 
    </div>
  );
}
