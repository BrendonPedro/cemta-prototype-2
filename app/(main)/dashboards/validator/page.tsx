// /dashboards/user/page.tsx
"use client";

import React from "react";
import FindRestaurantsAndMenus from "@/app/(marketing)/find-restaurants/FindRestaurantsAndMenus";
import { useAuth } from "@/components/AuthProvider";

export default function ValidatorDashboardPage() {
  const { userRole, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (userRole !== "validator") {
    return <div>Unauthorized access</div>;
  }

  return (
    <div>
      {/* Main content */}
      <FindRestaurantsAndMenus />
    </div>
  );
}
