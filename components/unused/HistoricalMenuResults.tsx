import React, { useState, useEffect } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import {
  getHistoricalMenus,
  getMenuDetails,
} from "@/app/services/firebaseFirestore";
import Link from "next/link";

interface HistoricalMenu {
  id: string;
  restaurantName: string;
  location: string;
  timestamp: string;
}

interface MenuDetails {
  imageUrl: string;
  menuData: any;
  userId: string;
}

const HistoricalMenuResults: React.FC = () => {
  const [historicalMenus, setHistoricalMenus] = useState<HistoricalMenu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [menuDetails, setMenuDetails] = useState<MenuDetails | null>(null);

  useEffect(() => {
    loadHistoricalMenus();
  }, []);

  const loadHistoricalMenus = async () => {
    try {
      const menus = await getHistoricalMenus(3); // Get the latest 3 processed menus
      setHistoricalMenus(menus as HistoricalMenu[]);
    } catch (error) {
      console.error("Error loading historical menus:", error);
    }
  };

  const handleSearch = async () => {
    if (searchTerm) {
      const searchResults = await getHistoricalMenus(10, searchTerm);
      setHistoricalMenus(searchResults as HistoricalMenu[]);
    }
  };

  const loadMenuDetails = async (menuId: string) => {
    const details = await getMenuDetails(menuId);
    setMenuDetails(details);
  };

  return (
    <div>
      <h2>Latest Processed Menus</h2>
      {historicalMenus.slice(0, 3).map((menu) => (
        <div key={menu.id}>
          <p>
            {menu.restaurantName} - {menu.location}
          </p>
          <p>{new Date(menu.timestamp).toLocaleString()}</p>
          <Link href={`/menu-details/${menu.id}`}>
            <Button>Open</Button>
          </Link>
        </div>
      ))}

      <h2>Search Historical Menus</h2>
      <Input
        type="text"
        placeholder="Search for a restaurant"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Button onClick={handleSearch}>Search</Button>

      {historicalMenus.length > 0 && (
        <Select
          onValueChange={(value) => {
            setSelectedMenu(value);
            loadMenuDetails(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a historical menu" />
          </SelectTrigger>
          <SelectContent>
            {historicalMenus.map((menu) => (
              <SelectItem key={menu.id} value={menu.id}>
                {menu.restaurantName} - {menu.location} -{" "}
                {new Date(menu.timestamp).toLocaleString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {menuDetails && (
        <div>
          <Image
            src={menuDetails.imageUrl}
            alt="Menu"
            width={300}
            height={300}
          />
          <pre>{JSON.stringify(menuDetails.menuData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default HistoricalMenuResults;
