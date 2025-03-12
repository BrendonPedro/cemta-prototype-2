// /dashboards/user/page.tsx
"use client";

import React from "react";
import { FindRestaurantsAndMenus } from "@/app/shared/components/FindRestaurantsAndMenus";
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
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow px-6 py-6">
        <FindRestaurantsAndMenus />
      </main>
    </div>
  );
}
