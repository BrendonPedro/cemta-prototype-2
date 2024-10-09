"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import {
  getVertexAiResults,
  getHistoricalMenus,
  getRecentMenus,
    searchMenus,
  
} from "@/app/services/firebaseFirestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Define types for our state
// Update MenuData interface to match the structure of your data
interface MenuData {
  menuData: {
    restaurant_info: {
      name: { original: string; english: string };
      address: { original: string };
      phone_number: string;
      operating_hours: string;
    };
    categories: Array<{
      name: { original: string; english: string; pinyin: string };
      items: Array<{
        name: { original: string; english: string; pinyin: string };
        description: { original: string; english: string };
        price: { amount: number; currency: string };
      }>;
    }>;
  };
  imageUrl: string;
  timestamp: string;
}

interface HistoricalMenu {
  id: string;
  restaurantName: string;
}

interface SearchResult {
  id: string;
  restaurantName: string;
  location: string;
}

interface MenuDetailsPageProps {
  id?: string;
}

const MenuDetailsPage: React.FC<MenuDetailsPageProps> = ({ id: propId }) => {
  const { id } = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentMenus, setRecentMenus] = useState<SearchResult[]>([]);
  const [historicalMenus, setHistoricalMenus] = useState<HistoricalMenu[]>([]);

  const fetchMenuData = useCallback(
    async (menuId: string) => {
      if (!userId) return;
      const data = await getVertexAiResults(userId, menuId);
      if (data) {
        setMenuData(data as MenuData);
      }
    },
    [userId]
  );

  const fetchHistoricalMenus = useCallback(async () => {
    const menus = await getHistoricalMenus(10);
    setHistoricalMenus(menus as HistoricalMenu[]);
  }, []);

  useEffect(() => {
    if (id && userId) {
      fetchMenuData(Array.isArray(id) ? id[0] : id);
      fetchHistoricalMenus();
    }
  }, [id, userId, fetchMenuData, fetchHistoricalMenus]);

  const handleFetchMenuData = async (menuId: string) => {
    if (!userId) return;
    const data = await getVertexAiResults(userId, menuId);
    if (data) {
      setMenuData(data as MenuData);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim()) {
      const results = await searchMenus(searchTerm);
      setSearchResults(results);
    }
  };

  const handleSelectMenu = (menuId: string) => {
    router.push(`/menu-details/${menuId}`);
  };

  const fetchRecentMenus = useCallback(async () => {
    if (userId) {
      const recent = await getRecentMenus(userId);
      setRecentMenus(recent);
    }
  }, [userId]);

  // Fetch menu data based on id
  useEffect(() => {
    if (id && userId) {
      fetchRecentMenus();
      fetchMenuData(Array.isArray(id) ? id[0] : id);
    }
  }, [id, userId, fetchRecentMenus, fetchMenuData]);

  const handleReprocess = useCallback(async () => {
    if (id && userId) {
      await fetchMenuData(Array.isArray(id) ? id[0] : id);
    }
  }, [id, userId, fetchMenuData]);

  if (!id) {
    return <div>No menu ID provided</div>;
  }

  if (!id && !menuData) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Menu Details</h1>
        <div className="mb-6">
          <Input
            type="text"
            placeholder="Search menus or restaurants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-2"
          />
          <Button onClick={handleSearch}>Search</Button>
        </div>

        {searchResults.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Search Results</h2>
            {searchResults.map((result) => (
              <Card
                key={result.id}
                className="mb-2 cursor-pointer"
                onClick={() => handleSelectMenu(result.id)}
              >
                <CardContent className="p-4">
                  <p className="font-bold">{result.restaurantName}</p>
                  <p className="text-sm text-gray-600">{result.location}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {recentMenus.length > 0 ? (
          <div>
            <h2 className="text-xl font-semibold mb-2">Recent Menus</h2>
            {recentMenus.map((menu) => (
              <Card
                key={menu.id}
                className="mb-2 cursor-pointer"
                onClick={() => handleSelectMenu(menu.id)}
              >
                <CardContent className="p-4">
                  <p className="font-bold">{menu.restaurantName}</p>
                  <p className="text-sm text-gray-600">{menu.location}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p>No menu history available. Use the search bar to find menus.</p>
        )}
      </div>
    );
  }

  if (!menuData) return <div>Loading...</div>;

  const { menuData: menu, timestamp, imageUrl } = menuData;
  const { restaurant_info, categories } = menu;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">
        {restaurant_info.name.original} - {restaurant_info.name.english}
      </h1>
      <p className="text-gray-600 mb-4">
        Processed on: {format(new Date(timestamp), "PPpp")}
      </p>

      <div className="grid md:grid-cols-2 gap-6">
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
              layout="responsive"
              objectFit="contain"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restaurant Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              <strong>Address:</strong> {restaurant_info.address.original}
            </p>
            <p>
              <strong>Phone:</strong> {restaurant_info.phone_number}
            </p>
            <p>
              <strong>Hours:</strong> {restaurant_info.operating_hours}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.map((category, index) => (
            <div key={index} className="mb-4">
              <h3 className="text-xl font-semibold mb-2">
                {category.name.original} - {category.name.english}
              </h3>
              <ul>
                {category.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="mb-2">
                    <strong>
                      {item.name.original} - {item.name.english}
                    </strong>
                    <p>{item.description.english}</p>
                    <p>
                      Price: {item.price.amount} {item.price.currency}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button onClick={handleReprocess} className="bg-yellow-500 text-white">
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