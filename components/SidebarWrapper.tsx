// app/components/SidebarWrapper.tsx

"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/app/shared/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import { getSidebarItemsByRole } from "@/components/sidebarItems";

const SidebarWrapper = ({
  onSidebarToggle,
}: {
  onSidebarToggle: (isCollapsed: boolean) => void;
}) => {
  const pathname = usePathname();
  const { userRole } = useAuth();
  const sidebarItems = getSidebarItemsByRole(userRole || "user");

  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    onSidebarToggle(!isCollapsed); // Inform parent component of collapse state
  };

  const sidebarPaths = ["/dashboards", "/menuAnalyzer", "/menu-details", "/find-restaurants"];

  const shouldShowSidebar = sidebarPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (!shouldShowSidebar) {
    return null;
  }

  return (
    <div className="sidebar-wrapper mt-16">
      <input
        type="checkbox"
        id="sidebar-toggle"
        className="hidden"
        checked={isCollapsed}
        onChange={handleToggleSidebar}
      />
      <Sidebar items={sidebarItems} userRole={userRole || "user"} />
    </div>
  );
};

export default SidebarWrapper;
