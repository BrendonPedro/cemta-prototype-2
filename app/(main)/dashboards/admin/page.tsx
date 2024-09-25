"use client";

import React from "react";
import DashboardLayout from "@/app/shared/layouts/DashboardLayout";
import { useAuth } from "@/components/AuthProvider";
import FindRestaurantsAndMenus from "@/app/shared/components/FindRestaurantsAndMenus";

const sidebarItems = [
  { name: "Overview", href: "/dashboards/admin" },
  { name: "User Management", href: "/dashboards/admin/user-management" },
  { name: "System Analytics", href: "/dashboards/admin/system-analytics" },
];

export default function AdminDashboard() {
  const { userRole, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (userRole !== "admin") {
    return <div>Unauthorized access</div>;
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} userRole={userRole}>
      <h1 className="text-3xl font-semibold text-gray-800">Admin Dashboard</h1>
      <FindRestaurantsAndMenus />
    </DashboardLayout>
  );
}
