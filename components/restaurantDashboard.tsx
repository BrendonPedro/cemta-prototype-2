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
import { Check, MapPin, Search, RefreshCw, Info } from "lucide-react";
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

interface Restaurant {
  id: string;
  name: string;
  menus: number;
  location: string;
  latitude: number;
  longitude: number;
}

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};

export default function RestaurantDashboard() {
  const { userId } = useClerkAuth();
  const { firebaseToken, loading: authLoading, error: authError } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [center, setCenter] = useState({ lat: 0, lng: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

        const restaurantsWithMenus = await Promise.all(
          data.restaurants.map(async (r: Restaurant) => {
            const menuCount = await getMenuCountForRestaurant(userId!, r.id);
            return { ...r, menus: menuCount };
          })
        );

        setRestaurants(restaurantsWithMenus);
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

  const handleSearch = () => {
    // Here you would typically geocode the searchTerm to get lat/lng
    // For simplicity, we'll just filter the existing restaurants
    const filteredRestaurants = restaurants.filter((restaurant) =>
      restaurant.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setRestaurants(filteredRestaurants);
  };

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
    } catch (error) {
      console.error("Error requesting menu:", error);
      setError("Failed to request menu. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="flex space-x-4 mb-6">
            <Input
              placeholder="Search restaurants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow bg-white"
            />
            <Button
              onClick={handleSearch}
              className="bg-customTeal hover:bg-customTeal/90 text-white"
            >
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </div>
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
          <Table>
            <TableHeader>
              <TableRow className="bg-customTeal/10">
                <TableHead className="text-customTeal">Restaurant</TableHead>
                <TableHead className="text-customTeal">Menu</TableHead>
                <TableHead className="text-customTeal">Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants.map((restaurant) => (
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
              {restaurants.map((restaurant) => (
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