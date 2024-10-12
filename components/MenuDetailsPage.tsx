// components/MenuDetailsPage.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import { getVertexAiResults } from "@/app/services/firebaseFirestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import MenuDataDisplay from "@/components/MenuDataDisplay";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MenuData {
  menuData: {
    restaurant_info: {
      name: { original: string; english?: string };
      address?: { original: string };
      phone_number?: string;
      operating_hours?: string;
    };
    categories: Array<{
      name: { original: string; english?: string; pinyin?: string };
      items: Array<{
        name: { original: string; english?: string; pinyin?: string };
        description?: { original?: string; english?: string };
        price?: { amount: number; currency: string };
      }>;
    }>;
    other_info?: string;
  };
  imageUrl?: string;
  timestamp?: string;
}

const MenuDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useAuth();
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenuData = useCallback(
    async (menuId: string) => {
      if (!userId) return;
      try {
        setIsLoading(true);
        const data = await getVertexAiResults(userId, menuId);
        if (data) {
          setMenuData(data as MenuData);
        } else {
          setError("Menu data not found.");
        }
      } catch (error) {
        console.error("Error fetching menu data:", error);
        setError((error as Error).message || "Failed to fetch menu data");
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (id && userId) {
      fetchMenuData(id);
    }
  }, [id, userId, fetchMenuData]);

  const handleReprocess = useCallback(async () => {
    if (id && userId) {
      await fetchMenuData(id);
    }
  }, [id, userId, fetchMenuData]);

  if (!id) {
    return <div>No menu ID provided</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="mr-2 h-6 w-6 text-teal-500" />
        <span>Loading menu data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!menuData) {
    return (
      <div className="p-4">
        <p>No menu data available. Please try again later.</p>
      </div>
    );
  }

  const { menuData: menu, timestamp, imageUrl } = menuData;
  const { restaurant_info } = menu;

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">
        {restaurant_info.name.original}
        {restaurant_info.name.english
          ? ` - ${restaurant_info.name.english}`
          : ""}
      </h1>
      <p className="text-gray-600 mb-4">
        Processed on:{" "}
        {timestamp ? format(new Date(timestamp), "PPpp") : "Unknown"}
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {imageUrl && (
          <Card>
            <CardHeader>
              <CardTitle>Menu Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <Image
                src={imageUrl}
                alt="Menu Preview"
                width={500}
                height={700}
                style={{ width: "100%", height: "auto" }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <MenuDataDisplay
        menuData={menu}
        menuName={`${restaurant_info.name.original}${
          restaurant_info.name.english
            ? ` - ${restaurant_info.name.english}`
            : ""
        }`}
      />

      <div className="mt-6">
        <Button onClick={handleReprocess} variant="default">
          Update Menu
        </Button>
        <p className="text-sm text-gray-600 mt-2">
          Note: Only update if the menu information is outdated. This will
          create a new version of the menu analysis.
        </p>
      </div>
    </div>
  );
};

export default MenuDetailsPage;
