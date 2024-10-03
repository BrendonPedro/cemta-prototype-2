import React from "react";
import MenuAnalyzer from "@/app/shared/components/MenuAnalyzer";
import { AuthProvider } from "@/components/AuthProvider";

const MenuAnalyzerPage = () => {
  return (
    <AuthProvider>
      <div>
        <MenuAnalyzer />
      </div>
    </AuthProvider>
  );
};

export default MenuAnalyzerPage;
