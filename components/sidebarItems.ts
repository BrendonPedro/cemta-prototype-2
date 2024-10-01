// sidebarItems.ts
export type UserRole = "user" | "partner" | "validator" | "admin";

export interface SidebarItem {
  name: string;
  href: string;
  icon?: React.ReactNode;
}

export function getSidebarItemsByRole(userRole: UserRole): SidebarItem[] {
  switch (userRole) {
    case "partner":
          return [
        { name: "Menu Analyzer", href: "/menuAnalyzer" },
        { name: "Manage Menus", href: "/dashboards/partner/manage-menus" },
        { name: "Analytics", href: "/dashboards/partner/analytics" },
      ];
    case "validator":
      return [
        { name: "Menu Analyzer", href: "/menuAnalyzer" },
        { name: "Validate Menus", href: "/dashboards/validator/validate-menus" },
        { name: "Recent Reviews", href: "/dashboards/validator/reviews" },
      ];
    case "admin":
          return [
        { name: "Menu Analyzer", href: "/menuAnalyzer" },
        { name: "Overview", href: "/dashboards/admin" },
        { name: "User Management", href: "/dashboards/admin/user-management" },
        { name: "System Analytics", href: "/dashboards/admin/system-analytics" },
      ];
    default:
      return [
        { name: "Edit Profile", href: "/EditProfile" },
        { name: "Menu Analyzer", href: "/menuAnalyzer" },
        { name: "Find Restaurants", href: "/dashboards/user/find-restaurants" },
        { name: "My Favorites", href: "/dashboards/user/favorites" },
      ];
  }
}
