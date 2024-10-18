// app/(marketing)/layout.tsx

"use client";

import React, { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { Footer } from "./footer";
import SidebarWrapper from "@/components/SidebarWrapper";
import { SlideOutMenu } from "@/components/SlideOutMenu";

type Props = {
  children: React.ReactNode;
  showBackgroundImage?: boolean;
};

const MarketingLayout = ({ children, showBackgroundImage = true }: Props) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  const handleSidebarToggle = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
  };

  // Define paths that should have the sidebar
  const sidebarPaths = ["/dashboards", "/menuAnalyzer", "/menu-details", "/find-restaurants"];
  const shouldShowSidebar = sidebarPaths.some((path) =>
    pathname.startsWith(path)
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-customTeal to-white">
      <Header />
      <div className="flex flex-grow">
        {shouldShowSidebar && (
          <SidebarWrapper onSidebarToggle={handleSidebarToggle} />
        )}
        <main
          className={`flex-grow flex justify-center ${
            shouldShowSidebar ? "" : "items-center"
          }`}
        >
          <div
            className={`w-full px-4 sm:px-6 lg:px-8 py-6
            ${
              shouldShowSidebar ? (isSidebarCollapsed ? "ml-20" : "ml-64") : ""
            } 
            transition-all duration-300`}
          >
            {showBackgroundImage && (
              <div className="fixed inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <Image
                  src="/cemta_logo_idea1.svg"
                  alt="CEMTA logo"
                  fill
                  style={{ objectFit: "cover" }}
                  quality={100}
                />
              </div>
            )}
            <div className="relative z-10 w-full max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
      <Footer />
      <SlideOutMenu />
    </div>
  );
};

export default MarketingLayout;
