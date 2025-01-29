"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
};

const MenuAnalyzerLayout = ({ children }: Props) => {
  return (
    <div className="min-h-screen bg-transparent pt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Section */}
          <header className="text-center py-12 bg-black text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-teal-700" />
            </div>

            {/* Content */}
            <div className="relative z-10 px-6">
              {/* Main Title */}
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-100">
                MenuAI
              </h1>

              {/* Subtitle */}
              <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto">
                A professional-grade translation tool specifically designed for
                menus, ensuring reliability and quality.
              </p>
            </div>

            {/* Decorative Elements */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-teal-400 to-teal-500" />
          </header>

          {/* Content Section */}
          <div className="p-6 md:p-8 lg:p-10">
            <div className="max-w-4xl mx-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuAnalyzerLayout;
