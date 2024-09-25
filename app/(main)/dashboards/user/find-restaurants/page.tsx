"use client";

import React from "react";
import FindRestaurantsAndMenus from "@/app/(main)/dashboards/user/find-restaurants/FindRestaurantsAndMenus";
import  RoleRequestButton  from "@/components/RoleRequestButton";
import  PendingApprovalMessage  from "@/components/PendingApprovalMessage";
import useClerkFirebaseAuth from "@/hooks/useClerkFirebaseAuth";

const sidebarItems = [
  { name: "Find Restaurants", href: "/dashboards/user/find-restaurants" },
  { name: "My Favorites", href: "/dashboards/user/favorites" },
  { name: "Recent Views", href: "/dashboards/user/recent" },
];

export default function UserDashboardPage() {
  const { userRole, roleRequest } = useClerkFirebaseAuth();

  return (
    <div>
      {roleRequest && roleRequest.status === "pending" ? (
        <PendingApprovalMessage />
      ) : (
        userRole === "user" && <RoleRequestButton />
      )}

      {/* Conditional rendering based on the current page */}
      <FindRestaurantsAndMenus />

      {/* You can add more conditional rendering here for other pages */}

      {/* Sidebar can be implemented as a separate component */}
      <div className="sidebar">
        {sidebarItems.map((item) => (
          <a key={item.href} href={item.href}>
            {item.name}
          </a>
        ))}
      </div>
    </div>
  );
}
