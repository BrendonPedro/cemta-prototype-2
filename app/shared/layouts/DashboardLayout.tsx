"use client";

import React from "react";
import Sidebar from "@/app/shared/components/Sidebar";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebarItems: { name: string; href: string; icon?: React.ReactNode }[];
  userRole: "user" | "partner" | "validator" | "admin";
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  sidebarItems,
  userRole,
}) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar items={sidebarItems} userRole={userRole} />
      <div className="flex-1 overflow-auto">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
