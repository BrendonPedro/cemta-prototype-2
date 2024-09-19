"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarItem {
  name: string;
  href: string;
  icon?: React.ReactNode;
}

export interface SidebarProps {
  items: SidebarItem[];
  userRole: "user" | "partner" | "validator" | "admin";
}

const Sidebar: React.FC<SidebarProps> = ({ items, userRole }) => {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white shadow-md">
      <div className="flex items-center justify-center h-16 bg-teal-600">
        <h2 className="text-xl font-semibold text-white">
          {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Dashboard
        </h2>
      </div>
      <nav className="mt-5">
        <ul>
          {items.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`flex items-center px-6 py-2 mt-4 duration-200 border-l-4 ${
                  pathname === item.href
                    ? "bg-teal-100 border-teal-600 text-teal-600"
                    : "border-transparent hover:bg-teal-50 hover:border-teal-600"
                }`}
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
