// /dashboards/admin/page.tsx
"use client";

import React from "react";
import { useAuth } from "@/components/AuthProvider";
import FindRestaurantsAndMenus from "@/app/(marketing)/find-restaurants/FindRestaurantsAndMenus";

export default function AdminDashboard() {
  const { userRole, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (userRole !== "admin") {
    return <div>Unauthorized access</div>;
  }

  return (
    <>
      <h1 className="text-3xl font-semibold text-gray-800">Admin Dashboard</h1>
      <FindRestaurantsAndMenus />
    </>
  );
}
