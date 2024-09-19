// app/dashboards/admin/page.tsx
import React from "react";
import DashboardLayout from "@/app/shared/layouts/DashboardLayout";

const sidebarItems = [
  { name: "Overview", href: "/dashboards/admin" },
  { name: "User Management", href: "/dashboards/admin/user-management" },
  { name: "System Analytics", href: "/dashboards/admin/system-analytics" },
];

export default function AdminDashboard() {
  const userRole = "admin"; // or 'partner', 'validator', 'user' as appropriate
  return (
    <DashboardLayout sidebarItems={sidebarItems} userRole={userRole}>
      <h1 className="text-3xl font-semibold text-gray-800">Admin Dashboard</h1>
      {/* Add admin-specific content here */}
    </DashboardLayout>
  );
}
