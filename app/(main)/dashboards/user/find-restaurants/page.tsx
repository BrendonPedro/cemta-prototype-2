"use client";

import React from "react";
import FindRestaurantsAndMenus from "@/app/(main)/dashboards/user/find-restaurants/FindRestaurantsAndMenus";

const sidebarItems = [
  { name: "Find Restaurants", href: "/dashboards/user/find-restaurants" },
  { name: "My Favorites", href: "/dashboards/user/favorites" },
  { name: "Recent Views", href: "/dashboards/user/recent" },
];

export default function FindRestaurantsPage() {
  const userRole = "user"; // or 'partner', 'validator', 'user' as appropriate
  return (
    <div>
      <FindRestaurantsAndMenus />
    </div>
  );
}
