// components/sidebarItems.ts

export type UserRole = "user" | "partner" | "validator" | "admin";

export interface SidebarItem {
  name: string;
  href: string;
  icon?: React.ReactNode;
}

export function getSidebarItemsByRole(userRole: UserRole): SidebarItem[] {
  const dashboardItem = { name: "Dashboard", href: `/dashboards/${userRole}` };
  const menuDetailsItem = { name: "Menu Details", href: "/menu-details" }; // Updated href

  switch (userRole) {
    case "partner":
      return [
        dashboardItem,
        { name: "TranslateMenuPro", href: "/menuAnalyzer" },
        menuDetailsItem,
        { name: "Manage Menus", href: "/dashboards/partner/manage-menus" },
        { name: "Analytics", href: "/dashboards/partner/analytics" },
      ];
    case "validator":
      return [
        dashboardItem,
        { name: "TranslateMenuPro", href: "/menuAnalyzer" },
        menuDetailsItem,
        {
          name: "Validate Menus",
          href: "/dashboards/validator/validate-menus",
        },
        { name: "Recent Reviews", href: "/dashboards/validator/reviews" },
      ];
    case "admin":
      return [
        dashboardItem,
        { name: "TranslateMenuPro", href: "/menuAnalyzer" },
        menuDetailsItem,
        { name: "Overview", href: "/dashboards/admin" },
        { name: "User Management", href: "/dashboards/admin/user-management" },
        {
          name: "System Analytics",
          href: "/dashboards/admin/system-analytics",
        },
      ];
    default:
      return [
        dashboardItem,
        { name: "TranslateMenuPro", href: "/menuAnalyzer" },
        menuDetailsItem,
        { name: "Find Restaurants", href: "/find-restaurants" },
        { name: "My Favorites", href: "/dashboards/user/favorites" },
        { name: "Edit Profile", href: "/EditProfile" },
      ];
  }
}
