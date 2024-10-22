// components/RestaurantPage.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
  getCachedRestaurantDetails,
  getMenusByRestaurantId,
} from "@/app/services/firebaseFirestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import Image from "next/image";

interface RestaurantPageProps {
  restaurantId: string;
}

const RestaurantPage: React.FC<RestaurantPageProps> = ({ restaurantId }) => {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menus, setMenus] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("menus");

  useEffect(() => {
    async function fetchData() {
      const restaurantDetails = await getCachedRestaurantDetails(restaurantId);
      setRestaurant(restaurantDetails);

      const menusData = await getMenusByRestaurantId(restaurantId);
      setMenus(menusData);
    }

    fetchData();
  }, [restaurantId]);

  if (!restaurant) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row">
        <div className="md:w-2/3">
          {/* Restaurant Image */}
          <div className="relative w-full h-64 md:h-96">
            <Image
              src={
                restaurant.imageUrl ||
                "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1074&q=80"
              }
              alt={restaurant.name}
              layout="fill"
              objectFit="cover"
            />
          </div>
        </div>
        <div className="md:w-1/3 md:pl-8">
          {/* Restaurant Info */}
          <h1 className="text-4xl font-bold mt-4 md:mt-0">{restaurant.name}</h1>
          <p className="text-gray-700 mt-2">{restaurant.address}</p>
          <p className="text-gray-700 mt-2">Rating: {restaurant.rating}</p>
          {/* Additional info from Google if available */}
        </div>
      </div>
      {/* Tabs */}
      <Tabs
        defaultValue="menus"
        className="w-full mt-8"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="menus">Menus ({menus.length})</TabsTrigger>
          <TabsTrigger value="reviews">Reviews (0)</TabsTrigger>
        </TabsList>
        <TabsContent value="menus" className="mt-4">
          {/* Display menus */}
          {menus.map((menu) => (
            <Card key={menu.id} className="mb-4">
              <h3 className="text-2xl font-semibold">{menu.menuName}</h3>
              {/* Display menu image or other details */}
              <Image
                src={
                  menu.imageUrl ||
                  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1074&q=80"
                }
                alt={menu.menuName}
                width={500}
                height={300}
                className="rounded-lg mt-4"
              />
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          {/* Display reviews */}
          <p>No reviews yet.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RestaurantPage;
