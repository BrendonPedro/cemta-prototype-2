'use client';

import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Check,
  MapPin,
  Search,
  RefreshCw,
  Info,
  ChevronDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import {
  getMenuCountForRestaurant,
  saveVertexAiResults,
} from "@/app/services/firebaseFirestore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Restaurant {
  id: string;
  name: string;
  menus: number;
  location: string;
  county: string;
  latitude: number;
  longitude: number;
}

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};

const taiwanCounties = [
  "Taipei City",
  "New Taipei City",
  "Taoyuan City",
  "Taichung City",
  "Tainan City",
  "Kaohsiung City",
  "Hsinchu City",
  "Hsinchu County",
  "Miaoli County",
  "Changhua County",
  "Nantou County",
  "Yunlin County",
  "Chiayi City",
  "Chiayi County",
  "Pingtung County",
  "Yilan County",
  "Hualien County",
  "Taitung County",
  "Penghu County",
  "Kinmen County",
  "Lienchiang County",
];

export default function RestaurantDashboard() {
  const { userId } = useClerkAuth();
  const { firebaseToken, loading: authLoading, error: authError } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>(
    []
  );
  const [nameFilter, setNameFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [countyFilter, setCountyFilter] = useState("all");
  const [center, setCenter] = useState({ lat: 0, lng: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const fetchNearbyRestaurants = useCallback(
    async (lat: number, lng: number) => {
      setIsLoading(true);
      setIsRefreshing(true);
      try {
        const response = await fetch(
          `/api/nearby-restaurants?lat=${lat}&lng=${lng}`
        );
        if (!response.ok) throw new Error("Failed to fetch nearby restaurants");
        const data = await response.json();

        const restaurantsWithMenusAndCounty = await Promise.all(
          data.restaurants.map(async (r: Restaurant) => {
            const menuCount = await getMenuCountForRestaurant(userId!, r.id);
            // Here we're adding a function to determine the county based on location
            const county = determineCounty(r.location);
            return { ...r, menus: menuCount, county };
          })
        );

        setRestaurants(restaurantsWithMenusAndCounty);
        setFilteredRestaurants(restaurantsWithMenusAndCounty);
        setCenter({ lat, lng });
      } catch (err) {
        console.error("Error fetching restaurants:", err);
        setError("Failed to fetch restaurants. Please try again.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId]
  );

  // Function to determine county based on location
  const determineCounty = (location: string): string => {
    // This is a simplified example. You'd need a more comprehensive mapping of locations to counties.
    if (location.includes("Zhunan")) return "Miaoli County";
    // Add more mappings as needed
    return "Unknown County";
  };

  useEffect(() => {
    if (authLoading || !firebaseToken || !userId) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchNearbyRestaurants(latitude, longitude);
      },
      (error) => {
        console.error("Error getting user location:", error);
        setError(
          "Failed to get user location. Please enable location services and try again."
        );
        setIsLoading(false);
      }
    );
  }, [userId, firebaseToken, authLoading, fetchNearbyRestaurants]);

  const handleRefreshLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchNearbyRestaurants(latitude, longitude);
      },
      (error) => {
        console.error("Error getting user location:", error);
        setError(
          "Failed to get user location. Please enable location services and try again."
        );
      }
    );
  };

    const handleFilter = useCallback(() => {
      const filtered = restaurants.filter(
        (restaurant) =>
          (nameFilter === "all" || restaurant.name === nameFilter) &&
          (locationFilter === "all" ||
            restaurant.location === locationFilter) &&
          (countyFilter === "all" || restaurant.county === countyFilter)
      );
      setFilteredRestaurants(filtered);
    }, [restaurants, nameFilter, locationFilter, countyFilter]);

    useEffect(() => {
      handleFilter();
    }, [handleFilter]);
  
  const handleRequestMenu = async (
    restaurantId: string,
    restaurantName: string
  ) => {
    if (!userId) {
      setError("User ID is not available. Please log in and try again.");
      return;
    }

    try {
      setIsLoading(true);
      // Here you would typically call your menu fetching service
      // For this example, we'll just create a dummy menu
      const dummyMenu = {
        restaurant_info: {
          name: restaurantName,
          address: "Dummy Address",
        },
        menu_items: [
          { name: "Dish 1", price: "$10" },
          { name: "Dish 2", price: "$15" },
        ],
      };

      await saveVertexAiResults(
        userId,
        dummyMenu,
        restaurantId,
        restaurantName
      );

      setRestaurants((prevRestaurants) =>
        prevRestaurants.map((r) =>
          r.id === restaurantId ? { ...r, menus: 1 } : r
        )
      );
      handleFilter(); // Refresh the filtered restaurants
    } catch (error) {
      console.error("Error requesting menu:", error);
      setError("Failed to request menu. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueNames = Array.from(new Set(restaurants.map((r) => r.name)));
  const uniqueLocations = Array.from(
    new Set(restaurants.map((r) => r.location))
  );

  if (authLoading || isLoading) {
    return <div>Loading...</div>;
  }

  if (authError || error) {
    return <div>Error: {authError || error}</div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6">
      <Card className="w-full lg:w-1/2 bg-gradient-to-br from-gray-50 to-gray-100 shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center mb-6">
            <motion.span className="relative inline-block">
              <span className="text-customTeal">Nearby Restaurants</span>
            </motion.span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <Button
              onClick={handleRefreshLocation}
              className="bg-customTeal hover:bg-customTeal/90 text-white"
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh Location"}
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-5 w-5 text-customTeal" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Refreshing updates the current location and fetches nearby
                    restaurants based on your new position.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="mb-6">
            <Select onValueChange={setCountyFilter} value={countyFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by county" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counties</SelectItem>
                {taiwanCounties.map((county) => (
                  <SelectItem key={county} value={county}>
                    {county}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-customTeal/10">
                <TableHead className="text-customTeal">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center">
                      Restaurant <ChevronDown className="ml-2 h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => setNameFilter("all")}>
                        All
                      </DropdownMenuItem>
                      {uniqueNames.map((name) => (
                        <DropdownMenuItem
                          key={name}
                          onSelect={() => setNameFilter(name)}
                        >
                          {name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
                <TableHead className="text-customTeal">Menu</TableHead>
                <TableHead className="text-customTeal">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center">
                      Location <ChevronDown className="ml-2 h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onSelect={() => setLocationFilter("all")}
                      >
                        All
                      </DropdownMenuItem>
                      {uniqueLocations.map((location) => (
                        <DropdownMenuItem
                          key={location}
                          onSelect={() => setLocationFilter(location)}
                        >
                          {location}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRestaurants.map((restaurant) => (
                <TableRow key={restaurant.id} className="hover:bg-gray-50">
                  <TableCell>{restaurant.name}</TableCell>
                  <TableCell>
                    {restaurant.menus > 0 ? (
                      <div className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        Available
                      </div>
                    ) : (
                      <Button
                        variant="nextButton"
                        size="sm"
                        onClick={() =>
                          handleRequestMenu(restaurant.id, restaurant.name)
                        }
                        className="text-customTeal border-customTeal hover:bg-customTeal hover:text-white"
                      >
                        Request Menu
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>{restaurant.location}</TableCell>
                  <TableCell>{restaurant.county}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="w-full lg:w-1/2 bg-gradient-to-br from-gray-50 to-gray-100 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center mb-4">
            <span className="text-customTeal">Restaurant Locations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={14}
            >
              {filteredRestaurants.map((restaurant) => (
                <Marker
                  key={restaurant.id}
                  position={{
                    lat: restaurant.latitude,
                    lng: restaurant.longitude,
                  }}
                  title={restaurant.name}
                />
              ))}
            </GoogleMap>
          ) : (
            <div>Loading map...</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}