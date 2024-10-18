"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
};

const MenuAnalyzerLayout = ({ children }: Props) => {
  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      <div className="flex-grow bg-white shadow-xl rounded-lg overflow-hidden relative flex flex-col max-w-7xl mx-auto w-full">
        {/* Header Section */}
        <header className="text-center py-8 bg-gradient-to-r from-teal-900 to-teal-800 text-white relative">
          {/* Main Title with Glare Effect */}
          <h1 className="text-4xl md:text-5xl font-extrabold relative z-10">
            TranslateMenuPro
            {/* Glare Overlay */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-white via-transparent to-white opacity-0 hover:opacity-20 transition-opacity duration-500 pointer-events-none"></div>
          </h1>
          {/* Subtitle */}
          <p className="mt-3 text-base md:text-lg text-gray-200 max-w-3xl mx-auto">
            A professional-grade translation tool specifically designed for
            menus, ensuring reliability and quality.
          </p>
        </header>

        {/* Content Section */}
        <div className="flex-grow p-4 md:p-6 lg:p-8 overflow-auto">
          <div className="max-w-5xl mx-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default MenuAnalyzerLayout;
