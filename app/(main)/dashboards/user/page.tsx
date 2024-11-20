
// app/(main)/dashboards/user/page.tsx

"use client";

import React from "react";
import FindRestaurantsAndMenus from "@/app/shared/components/FindRestaurantsAndMenus";
import useClerkFirebaseAuth from "@/hooks/useClerkFirebaseAuth";

export default function UserDashboardPage() {
  const { userRole } = useClerkFirebaseAuth();

  if (!userRole) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow px-6 py-6">
        <FindRestaurantsAndMenus />
      </main>
    </div>
  );
}
