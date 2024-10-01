// DashboardLayout.tsx
"use client";

import React from "react";
import Sidebar from "@/app/shared/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import { getSidebarItemsByRole } from "@/components/sidebarItems";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { userRole } = useAuth();
  const sidebarItems = getSidebarItemsByRole(userRole ?? "user");

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar items={sidebarItems} userRole={userRole ?? "user"} />
      <div className="flex-1 overflow-auto">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
