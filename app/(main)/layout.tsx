"use client";

import React from "react";
import { useAuth } from "@/components/AuthProvider";
import { Header } from "@/app/(marketing)/header";
import { Footer } from "@/app/(marketing)/footer";
import DashboardLayout from "@/app/shared/layouts/DashboardLayout";

type Props = {
  children: React.ReactNode;
};

const MainLayout = ({ children }: Props) => {
  const { userRole } = useAuth(); // Now correctly fetches userRole from AuthProvider

  // Handle the case where userRole is null (before loading or no role set)
  const sidebarItems = getSidebarItemsByRole(userRole ?? "user");

  return (
    <div>
      <Header />
      <DashboardLayout
        sidebarItems={sidebarItems}
        userRole={userRole ?? "user"}
      >
        {children}
      </DashboardLayout>
      <Footer />
    </div>
  );
};

function getSidebarItemsByRole(
  userRole: "user" | "partner" | "validator" | "admin"
) {
  switch (userRole) {
    case "partner":
      return [
        { name: "Manage Menus", href: "/dashboards/partner/manage-menus" },
        { name: "Analytics", href: "/dashboards/partner/analytics" },
      ];
    case "validator":
      return [
        {
          name: "Validate Menus",
          href: "/dashboards/validator/validate-menus",
        },
        { name: "Recent Reviews", href: "/dashboards/validator/reviews" },
      ];
    case "admin":
      return [
        { name: "Admin Dashboard", href: "/dashboards/admin" },
        { name: "User Management", href: "/dashboards/admin/user-management" },
      ];
    default:
      return [
        { name: "Find Restaurants", href: "/dashboards/user/find-restaurants" },
        { name: "My Favorites", href: "/dashboards/user/favorites" },
        { name: "Menu Analyzer", href: "/menuAnalyzer" },
      ];
  }
}

export default MainLayout;
