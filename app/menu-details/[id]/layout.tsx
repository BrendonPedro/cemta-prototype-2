// app/menu-details/layout.tsx

import React from "react";
import { AuthProvider } from "@/components/AuthProvider";
import SidebarWrapper from "@/components/SidebarWrapper"; // Import SidebarWrapper

export default function MenuDetailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    
    <AuthProvider>
      <div className="flex">
        <SidebarWrapper /> {/* Include the SidebarWrapper */}
        <div className="flex-1">{children}</div>
      </div>
    </AuthProvider>
  );
}
