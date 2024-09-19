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
    <aside className="w-64 bg-gray-800 text-white p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold">
          {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Dashboard
        </h2>
      </div>
      <nav>
        {items.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`block py-2 px-4 rounded ${
              pathname === item.href ? "bg-gray-700" : "hover:bg-gray-700"
            }`}
          >
            {item.icon && <span className="mr-2">{item.icon}</span>}
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
