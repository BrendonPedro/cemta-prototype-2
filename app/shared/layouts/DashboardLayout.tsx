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
    <div className="flex flex-1 bg-gray-100">
      <Sidebar items={sidebarItems} userRole={userRole} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
};

export default DashboardLayout;
