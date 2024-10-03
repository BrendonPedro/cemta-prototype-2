// /dashboards/user/page.tsx
"use client";

import React from "react";
import FindRestaurantsAndMenus from "@/app/(marketing)/find-restaurants/FindRestaurantsAndMenus";
import useClerkFirebaseAuth from "@/hooks/useClerkFirebaseAuth";

export default function UserDashboardPage() {
  const { userRole } = useClerkFirebaseAuth();

  if (!userRole) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Main content */}
      <FindRestaurantsAndMenus />
    </div>
  );
}
