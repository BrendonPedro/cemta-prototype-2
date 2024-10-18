
// app/menu-details/layout.tsx

"use client";

import React, { useState } from "react";
import Image from "next/image";
import { AuthProvider } from "@/components/AuthProvider";
import { Header } from "@/app/(marketing)/header";
import { Footer } from "@/app/(marketing)/footer";
import SidebarWrapper from "@/components/SidebarWrapper";
import { SlideOutMenu } from "@/components/SlideOutMenu";

type Props = {
  children: React.ReactNode;
  showBackgroundImage?: boolean;
};

const MenuDetailsLayout = ({ children, showBackgroundImage = true }: Props) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSidebarToggle = (isCollapsed: boolean) => {
    setIsSidebarCollapsed(isCollapsed);
  };

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-customTeal to-white">
        <Header />
        <div className="flex flex-grow">
          <SidebarWrapper onSidebarToggle={handleSidebarToggle} />
          <main
            className={`flex-grow relative p-6 transition-all duration-300 ${
              isSidebarCollapsed ? "ml-20" : "ml-64"
            }`}
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
            <div className="relative z-10 min-h-full">{children}</div>
          </main>
        </div>
        <Footer />
        <SlideOutMenu />
      </div>
    </AuthProvider>
  );
};

export default MenuDetailsLayout;
