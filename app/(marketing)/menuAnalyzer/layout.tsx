// app/(marketing)/menuAnalyzer/layout.tsx

"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
};

const MenuAnalyzerLayout = ({ children }: Props) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden relative">
          {/* Header Section */}
          <header className="text-center py-6 bg-gradient-to-r from-teal-900 to-teal-900 text-white relative">
            {/* Main Title with Glare Effect */}
            <h1 className="text-3xl md:text-4xl font-extrabold relative z-10">
              TranslateMenuPro
              {/* Glare Overlay */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-white via-transparent to-white opacity-0 hover:opacity-20 transition-opacity duration-500 pointer-events-none"></div>
            </h1>
            {/* Subtitle */}
            <p className="mt-2 text-sm md:text-base text-gray-200">
              A professional-grade translation tool specifically designed for
              menus, ensuring reliability and quality.
            </p>
          </header>

          {/* Content Section */}
          <div className="p-4 md:p-6">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default MenuAnalyzerLayout;
