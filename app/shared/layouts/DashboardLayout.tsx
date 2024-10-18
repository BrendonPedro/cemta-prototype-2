"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Header } from "@/app/(marketing)/header";
import { Footer } from "@/app/(marketing)/footer";
import SidebarWrapper from "@/components/SidebarWrapper";
import { SlideOutMenu } from "@/components/SlideOutMenu";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSidebarToggle = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-customTeal to-white">
      <Header />
      <div className="flex flex-grow overflow-hidden">
        {/* Sidebar with collapse state handling */}
        <SidebarWrapper onSidebarToggle={handleSidebarToggle} />

        {/* Main content area */}
        <main
          className={`flex-grow relative p-6 transition-all duration-300 ${
            isSidebarCollapsed ? "ml-[5rem]" : "ml-[16rem]"
          }`}
        >
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
