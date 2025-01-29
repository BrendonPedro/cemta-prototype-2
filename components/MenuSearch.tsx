"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  searchRestaurants,
  getMenusByRestaurantId,
} from "@/app/services/firebaseFirestore";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import type { SearchResult, MenuSummary } from "@/app/services/restaurant/types";

interface MenuSearchProps {
  onMenuSelect?: (menuId: string) => void;
}

const MenuSearch: React.FC<MenuSearchProps> = ({ onMenuSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [restaurantResults, setRestaurantResults] = useState<SearchResult[]>([]);
  const [menuResults, setMenuResults] = useState<MenuSummary[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState<MenuSummary | null>(null);
  const router = useRouter();

  const handleSearchRestaurants = async () => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    setMenuResults([]);
    setSelectedRestaurantId(null);
    setSelectedMenu(null);

    try {
      const results = await searchRestaurants(searchTerm);
      setRestaurantResults(results.map(r => ({
        id: r.id,
        restaurantName: r.name || '',
        location: r.address || ''
      })));
    } catch (error) {
      console.error("Error searching restaurants:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRestaurant = async (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    setIsLoading(true);
    setSelectedMenu(null);

    try {
      const menus = await getMenusByRestaurantId(restaurantId);
      setMenuResults(menus);
    } catch (error) {
      console.error("Error fetching menus:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMenu = (menu: MenuSummary) => {
    setSelectedMenu(menu);
    if (onMenuSelect) {
      onMenuSelect(menu.id);
    }
  };

  const renderMenuName = (menuName: string | { original: string; english: string }) => {
    if (typeof menuName === "string") return menuName;
    return menuName.original + (menuName.english ? ` (${menuName.english})` : "");
  };

  return (
    <div className="space-y-4">
      {/* Search Section */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Search Restaurants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter restaurant name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchRestaurants()}
              className="flex-1"
            />
            <Button 
              onClick={handleSearchRestaurants}
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? <Spinner className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Search</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {restaurantResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="restaurants" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="restaurants">
                  Restaurants ({restaurantResults.length})
                </TabsTrigger>
                <TabsTrigger value="menus" disabled={!menuResults.length}>
                  Menus ({menuResults.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="restaurants">
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  <div className="space-y-2">
                    {restaurantResults.map((restaurant) => (
                      <Button
                        key={restaurant.id}
                        variant={selectedRestaurantId === restaurant.id ? "default" : "nextButton4"}
                        onClick={() => handleSelectRestaurant(restaurant.id)}
                        className="w-full justify-start text-left"
                      >
                        <div>
                          <div className="font-medium">{restaurant.restaurantName}</div>
                          <div className="text-sm text-muted-foreground">{restaurant.location}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="menus">
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                  <div className="space-y-2">
                    {menuResults.map((menu) => (
                      <Button
                        key={menu.id}
                        variant={selectedMenu?.id === menu.id ? "default" : "nextButton4"}
                        onClick={() => handleSelectMenu(menu)}
                        className="w-full justify-start text-left"
                      >
                        {renderMenuName(menu.menuName)}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Preview Section */}
      {selectedMenu && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Menu Preview</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Hide Preview
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Show Preview
                </>
              )}
            </Button>
          </CardHeader>
          {showPreview && (
            <CardContent>
              {selectedMenu.imageUrl ? (
                <div className="relative w-full h-[400px]">
                  <Image
                    src={selectedMenu.imageUrl}
                    alt="Menu Preview"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-[400px] bg-gray-100 rounded-lg">
                  <p className="text-muted-foreground">No preview available</p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};

export default MenuSearch;
