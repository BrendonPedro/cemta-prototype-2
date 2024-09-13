import React from "react";

type Props = {
  children: React.ReactNode;
};

const MenuAnalyzerLayout = ({ children }: Props) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background">
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <h1 className="text-3xl text-center font-bold mb-6 text-customTeal">
            Menu Analyzer
          </h1>
          <div className="p-6 md:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default MenuAnalyzerLayout;
