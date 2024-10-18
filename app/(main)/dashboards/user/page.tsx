
// app/(main)/dashboards/user/page.tsx

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
    <div className="min-h-screen flex flex-col">
      {/* This div ensures the full usage of the width */}
      <main className="flex-grow px-6 py-6">
        <FindRestaurantsAndMenus />
      </main>
    </div>
  );
}
