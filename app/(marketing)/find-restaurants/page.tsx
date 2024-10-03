import React from "react";
import FindRestaurantsAndMenus from "@/app/(marketing)/find-restaurants/FindRestaurantsAndMenus";
import { AuthProvider } from "@/components/AuthProvider";

const MenuAnalyzerPage = () => {
  return (
    <AuthProvider>
      <div>
        <FindRestaurantsAndMenus />
      </div>
    </AuthProvider>
  );
};

export default MenuAnalyzerPage;
