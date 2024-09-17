'use client';

import React, { useState } from "react";

type Props = {
  children: React.ReactNode;
};

const MenuAnalyzerLayout = ({ children }: Props) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <h1 className="text-4xl text-center font-bold mt-6 relative">
            <span
              className="relative inline-block"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <span
                className={`
               font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-customTeal to-customTeal relative z-10
                before:content-[''] before:absolute before:inset-0
                before:bg-gradient-to-br before:from-transparent before:via-white before:to-transparent
                before:opacity-50
                after:content-[''] after:absolute after:inset-0
                after:bg-gradient-to-br after:from-transparent after:via-white after:to-transparent
                after:opacity-0 after:transition-opacity after:duration-1000
                ${isHovered ? "after:opacity-60" : ""}
              `}
              >
                Menu Analyzer
              </span>
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-customTeal transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100"></span>
            </span>
          </h1>
          <div className="p-6 md:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default MenuAnalyzerLayout;

