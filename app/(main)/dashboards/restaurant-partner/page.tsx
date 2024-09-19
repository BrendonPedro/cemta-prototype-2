"use client";

import React from "react";
import DashboardLayout from "@/app/shared/layouts/DashboardLayout";
import MenuAnalyzer from "@/app/shared/components/MenuAnalyzer";

const sidebarItems = [
  { name: "Overview", href: "/dashboards/restaurant-partner" },
  {
    name: "Menu Management",
    href: "/dashboards/restaurant-partner/menu-management",
  },
  { name: "Analytics", href: "/dashboards/restaurant-partner/analytics" },
];

export default function RestaurantPartnerDashboard() {
  const userRole = "partner"; // or 'partner', 'validator', 'user' as appropriate
  return (
    <DashboardLayout sidebarItems={sidebarItems} userRole={userRole}>
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">
        Restaurant Partner Dashboard
      </h1>
      <MenuAnalyzer />
    </DashboardLayout>
  );
}
