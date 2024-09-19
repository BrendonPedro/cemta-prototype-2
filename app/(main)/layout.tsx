"use client";

import React from "react";
import { useAuth } from "@/components/AuthProvider";
import DashboardLayout, {
  DashboardLayoutProps,
} from "@/app/shared/layouts/DashboardLayout";

type Props = {
  children: React.ReactNode;
};

const MainLayout = ({ children }: Props) => {
  const { firebaseToken, loading, error } = useAuth();

  // Determine user role (you might need to adjust this based on your auth logic)
  const userRole: DashboardLayoutProps["userRole"] = "user"; // Default to 'user', adjust as needed

  const sidebarItems = [
    { name: "Find Restaurants", href: "/dashboards/user/find-restaurants" },
    { name: "My Favorites", href: "/dashboards/user/favorites" },
    { name: "Recent Views", href: "/dashboards/user/recent-views" },
  ];

  return (
    <DashboardLayout sidebarItems={sidebarItems} userRole={userRole}>
      {children}
    </DashboardLayout>
  );
};

export default MainLayout;
