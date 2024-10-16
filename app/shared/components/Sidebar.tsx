// app/shared/components/Sidebar.tsx
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarItem, UserRole } from "@/components/sidebarItems";
import {
  Home,
  FileText,
  Search,
  Heart,
  BarChart2,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  items: SidebarItem[];
  userRole: UserRole;
}

const Sidebar: React.FC<SidebarProps> = ({ items, userRole }) => {
  const pathname = usePathname();

  const getIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "edit profile":
        return <Settings size={20} />;
      case "translatemenupro":
        return <FileText size={20} />;
      case "find restaurants":
        return <Search size={20} />;
      case "my favorites":
        return <Heart size={20} />;
      case "manage menus":
        return <FileText size={20} />;
      case "analytics":
        return <BarChart2 size={20} />;
      case "validate menus":
        return <FileText size={20} />;
      case "recent reviews":
        return <FileText size={20} />;
      case "overview":
        return <Home size={20} />;
      case "user management":
        return <Users size={20} />;
      case "system analytics":
        return <BarChart2 size={20} />;
      case "menu details":
        return <FileText size={20} />; // Added case for "Menu Details"
      default:
        return <Home size={20} />;
    }
  };

  return (
    <aside className="sidebar rounded-tr-2xl rounded-br-2xl shadow-lg">
      <div className="p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800 truncate sidebar-full">
          {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Dashboard
        </h2>
        <label
          htmlFor="sidebar-toggle"
          className="cursor-pointer p-2 rounded-full hover:bg-gray-200 transition-colors duration-200"
        >
          <ChevronLeft size={20} className="sidebar-full" />
          <ChevronRight size={20} className="sidebar-collapsed" />
        </label>
      </div>
      <nav className="flex-grow">
        <ul className="space-y-2 p-2">
          {items.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                  pathname === item.href
                    ? "bg-teal-500 text-white shadow-md"
                    : "text-gray-600 hover:bg-teal-100 hover:text-teal-600"
                }`}
              >
                <span className="mr-3 flex-shrink-0">{getIcon(item.name)}</span>
                <span className="font-medium sidebar-full">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-2 border-t border-gray-200">
        <Link
          href="/api/auth/signout"
          className="flex items-center p-3 rounded-lg text-gray-600 hover:bg-red-100 hover:text-red-600 transition-all duration-200"
        >
          <LogOut size={20} className="mr-3 flex-shrink-0" />
          <span className="font-medium sidebar-full">Sign Out</span>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
