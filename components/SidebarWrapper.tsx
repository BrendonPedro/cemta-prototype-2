// app/components/SidebarWrapper.tsx
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/app/shared/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import { getSidebarItemsByRole } from "@/components/sidebarItems";

const SidebarWrapper = () => {
  const pathname = usePathname();
  const { userRole } = useAuth();
  const sidebarItems = getSidebarItemsByRole(userRole || "user");

  // Define the paths where the sidebar should be shown
  const sidebarPaths = ["/dashboards", "/menuAnalyzer"];

  // Check if the current path starts with any of the sidebarPaths
  const shouldShowSidebar = sidebarPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (!shouldShowSidebar) {
    return null;
  }

  return (
    <div className="sidebar-wrapper mt-16">
      <input type="checkbox" id="sidebar-toggle" className="hidden" />
      <Sidebar items={sidebarItems} userRole={userRole || "user"} />
    </div>
  );
};

export default SidebarWrapper;
