// app/(marketing)/find-restaurants/page.tsx

import React from "react";
import FindRestaurantsAndMenus from "@/app/(marketing)/find-restaurants/FindRestaurantsAndMenus";
import { AuthProvider } from "@/components/AuthProvider";

const FindRestaurantsAndMenusPage = () => {
  return (
    <AuthProvider>
      <div>
        <FindRestaurantsAndMenus />
      </div>
    </AuthProvider>
  );
};

export default FindRestaurantsAndMenusPage;
