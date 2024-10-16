// components/MenuSearch.tsx

"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  searchRestaurants,
  getMenusByRestaurantId,
} from "@/app/services/firebaseFirestore";

interface SearchResult {
  id: string;
  restaurantName: string;
  location: string;
}

interface MenuSummary {
  id: string;
  menuName: string;
  timestamp: any;
}

interface MenuSearchProps {
  onMenuSelect?: (menuId: string) => void;
}

const MenuSearch: React.FC<MenuSearchProps> = ({ onMenuSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [restaurantResults, setRestaurantResults] = useState<SearchResult[]>(
    []
  );
  const [menuResults, setMenuResults] = useState<MenuSummary[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSearchRestaurants = async () => {
    setIsLoading(true);
    setMenuResults([]);
    setSelectedRestaurantId(null);

    try {
      const searchResults = await searchRestaurants(searchTerm);
      setRestaurantResults(searchResults);
    } catch (error) {
      console.error("Error searching restaurants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRestaurant = async (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    setIsLoading(true);

    try {
      const menus = await getMenusByRestaurantId(restaurantId);
      setMenuResults(menus);
    } catch (error) {
      console.error("Error fetching menus:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMenu = (menuId: string) => {
    if (onMenuSelect) {
      onMenuSelect(menuId);
    } else {
      router.push(`/menu-details?id=${menuId}`);
    }
  };

  return (
    <div>
      <Input
        placeholder="Search restaurants..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full"
      />
      <Button
        onClick={handleSearchRestaurants}
        className="mt-2 w-full"
        disabled={isLoading}
      >
        {isLoading ? "Searching..." : "Search"}
      </Button>

      {restaurantResults.length > 0 && (
        <ul className="mt-4">
          {restaurantResults.map((restaurant) => (
            <li key={restaurant.id} className="mb-2">
              <Button
                variant="cemta2"
                onClick={() => handleSelectRestaurant(restaurant.id)}
                className="w-full text-left"
              >
                {restaurant.restaurantName} - {restaurant.location}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {menuResults.length > 0 && selectedRestaurantId && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Menus:</h3>
          <ul>
            {menuResults.map((menu) => (
              <li key={menu.id} className="mb-2">
                <Button
                  variant="cemta"
                  onClick={() => handleSelectMenu(menu.id)}
                  className="w-full text-left"
                >
                  {menu.menuName}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MenuSearch;
