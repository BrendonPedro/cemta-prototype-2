// components/MenuAnalyzerLayout.tsx
"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
};

const MenuAnalyzerLayout = ({ children }: Props) => {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden relative">
          {/* Header Section */}
          <header className="text-center py-12 relative">
            {/* Main Title with Glare Effect */}
            <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-customBlack to-customBlack2 relative z-10">
              TranslateMenuPro
              {/* Glare Overlay */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-white via-transparent to-white opacity-0 hover:opacity-50 transition-opacity duration-500 pointer-events-none"></div>
            </h1>
            {/* Subtitle */}
            <p className="mt-4 text-lg md:text-xl text-gray-600">
              A professional-grade translation tool specifically designed for
              menus, ensuring reliability and quality.
            </p>
          </header>

          {/* Content Section */}
          <div className="p-6 md:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default MenuAnalyzerLayout;
