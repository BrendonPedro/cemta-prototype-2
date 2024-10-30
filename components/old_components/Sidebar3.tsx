// components/Sidebar.tsx

"use client";

import React, { useEffect, useState } from "react";
import { getRecentMenus } from "@/app/services/firebaseFirestore";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  userId: string | null;
}

interface MenuItem {
  id: string;
  restaurantName: string;
  timestamp?: string;
}

const Sidebar3: React.FC<SidebarProps> = ({ userId }) => {
  const router = useRouter();
  const [recentMenus, setRecentMenus] = useState<MenuItem[]>([]);

  useEffect(() => {
    const fetchRecentMenus = async () => {
      if (userId) {
        const recent = await getRecentMenus(userId);
        setRecentMenus(recent);
      }
    };

    fetchRecentMenus();
  }, [userId]);

  const handleSelectMenu = (menuId: string) => {
    router.push(`/menu-details/${menuId}`);
  };

  return (
    <div className="w-64 bg-gray-100 p-4 overflow-y-auto">
      <h2 className="text-xl font-semibold mb-4">Recent Menus</h2>
      {recentMenus.length > 0 ? (
        recentMenus.map((menu) => (
          <Card
            key={menu.id}
            className="mb-2 cursor-pointer"
            onClick={() => handleSelectMenu(menu.id)}
          >
            <CardContent className="p-2">
              <p className="font-bold">{menu.restaurantName}</p>
              <p className="text-sm text-gray-600">
                {menu.timestamp
                  ? new Date(menu.timestamp).toLocaleDateString()
                  : ""}
              </p>
            </CardContent>
          </Card>
        ))
      ) : (
        <p>No recent menus available.</p>
      )}
      <Button
        variant="cemta"
        className="mt-4 w-full"
        onClick={() => router.push("/menu-analyzer")}
      >
        Upload New Menu
      </Button>
    </div>
  );
};

export default Sidebar3;
