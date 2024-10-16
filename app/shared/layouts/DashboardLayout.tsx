// DashboardLayout.tsx
"use client";

import React from "react";
import Image from "next/image";
import { Header } from "@/app/(marketing)/header";
import { Footer } from "@/app/(marketing)/footer";
import { useAuth } from "@/components/AuthProvider";
import { getSidebarItemsByRole } from "@/components/sidebarItems";
import SidebarWrapper from "@/components/SidebarWrapper";
import { SlideOutMenu } from "@/components/SlideOutMenu";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { userRole } = useAuth();
  const sidebarItems = getSidebarItemsByRole(userRole ?? "user");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-customTeal to-white">
      <Header />
      <div className="flex flex-grow">
        <SidebarWrapper />
        <main className="flex-grow relative p-6 transition-all duration-300">
          <div className="fixed inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Image
              src="/cemta_logo_idea1.svg"
              alt="CEMTA logo"
              fill
              style={{ objectFit: "cover" }}
              quality={100}
            />
          </div>
          <div className="relative z-10 min-h-full overflow-auto">
            {children}
          </div>
        </main>
      </div>
      <Footer />
      <SlideOutMenu />
    </div>
  );
};

export default DashboardLayout;
