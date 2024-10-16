"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Check, RefreshCw, ChevronDown, Info, MapPin } from "lucide-react";
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
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
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
  menuCount: number;
  address: string;
  county: string;
  latitude: number;
  longitude: number;
  rating: number;
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
    [],
  );
  const [nameFilter, setNameFilter] = useState("all");
  const [countyFilter, setCountyFilter] = useState("all");
  const [menuCountFilter, setMenuCountFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [center, setCenter] = useState({ lat: 0, lng: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0); // Pagination state
  const [focusedRestaurant, setFocusedRestaurant] = useState<Restaurant | null>(
    null,
  ); // Focused restaurant on map click

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const fetchNearbyRestaurants = useCallback(
    async (lat: number, lng: number) => {
      setIsLoading(true);
      setIsRefreshing(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/nearby-restaurants?lat=${lat}&lng=${lng}&limit=20`,
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch nearby restaurants: ${response.status} ${response.statusText}. ${errorText}`,
          );
        }
        const data = await response.json();

        const restaurantsWithDetails = await Promise.all(
          data.restaurants.map(async (r: any) => {
            const menuCount = await getMenuCountForRestaurant(userId!, r.id);
            const county = determineCounty(r.address);
            return {
              id: r.id,
              name: r.name,
              menuCount,
              address: r.address,
              county,
              latitude: r.latitude,
              longitude: r.longitude,
              rating: r.rating || 0, // Rating added
            };
          }),
        );

        setRestaurants(restaurantsWithDetails);
        setFilteredRestaurants(restaurantsWithDetails.slice(0, 10)); // Show top 10 initially
        setCenter({ lat, lng });
      } catch (err) {
        setError(
          `Failed to fetch restaurants: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId],
  );

  const determineCounty = (location: string): string => {
    if (location.includes("Zhunan")) return "Miaoli County";
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
        setError(
          "Failed to get user location. Please enable location services and try again.",
        );
        setIsLoading(false);
      },
    );
  }, [userId, firebaseToken, authLoading, fetchNearbyRestaurants]);

  const handleRefreshLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchNearbyRestaurants(latitude, longitude);
      },
      (error) => {
        setError(
          "Failed to get user location. Please enable location services and try again.",
        );
      },
    );
  };

  const handlePinLocation = (lat: number, lng: number) => {
    fetchNearbyRestaurants(lat, lng); // Fetch restaurants based on pin
  };

  const handleRequestMenu = async (
    restaurantId: string,
    restaurantName: string,
  ) => {
    try {
      setIsLoading(true);
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
        userId!,
        dummyMenu,
        restaurantId,
        restaurantName,
      );

      setRestaurants((prevRestaurants) =>
        prevRestaurants.map((r) =>
          r.id === restaurantId ? { ...r, menuCount: r.menuCount + 1 } : r,
        ),
      );
    } catch (error) {
      console.error("Error requesting menu:", error);
      setError(
        `Failed to request menu: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestaurantClick = (restaurant: Restaurant) => {
    setFocusedRestaurant(restaurant); // Focus only on clicked restaurant's marker
  };

  const resetFocus = () => {
    setFocusedRestaurant(null); // Reset the focused restaurant to show all markers
  };

  const handleFilter = useCallback(() => {
    const filtered = restaurants.filter(
      (restaurant) =>
        (nameFilter === "all" || restaurant.name === nameFilter) &&
        (countyFilter === "all" || restaurant.county === countyFilter) &&
        (ratingFilter === "all" ||
          (ratingFilter === "4+" && restaurant.rating >= 4) ||
          (ratingFilter === "3-4" &&
            restaurant.rating >= 3 &&
            restaurant.rating < 4) ||
          (ratingFilter === "0-3" && restaurant.rating < 3)) &&
        (menuCountFilter === "all" ||
          (menuCountFilter === "0" && restaurant.menuCount === 0) ||
          (menuCountFilter === "1-3" &&
            restaurant.menuCount >= 1 &&
            restaurant.menuCount <= 3) ||
          (menuCountFilter === "4+" && restaurant.menuCount >= 4)),
    );
    setFilteredRestaurants(
      filtered.slice(currentPage * 10, (currentPage + 1) * 10),
    ); // Paginate results
  }, [
    restaurants,
    nameFilter,
    countyFilter,
    ratingFilter,
    menuCountFilter,
    currentPage,
  ]);

  useEffect(() => {
    handleFilter();
  }, [handleFilter]);

  const handleNextPage = () => {
    setCurrentPage((prev) => prev + 1); // Move to the next page
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0)); // Go to the previous page, but don't go below 0
  };

  if (authLoading || isLoading) {
    return <div>Loading...</div>;
  }

  if (authError || error) {
    return <div>Error: {authError || error}</div>;
  }

  const isLastPage = currentPage === 1 || restaurants.length <= 10;

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6">
      <Card className="w-full lg:w-3/5 bg-gradient-to-br from-gray-50 to-gray-100 shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center mb-6">
            <motion.span className="relative inline-block">
              <span className="text-customTeal">Nearby Restaurants</span>
            </motion.span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search bar for county */}
          <div className="mb-4">
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

          {/* Restaurant Table */}
          <Table className="table-auto w-full">
            <TableHeader>
              <TableRow className="bg-customTeal/10">
                <TableHead className="text-customTeal w-2/5 text-left">
                  Restaurant
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center ml-2">
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => setNameFilter("all")}>
                        All Restaurants
                      </DropdownMenuItem>
                      {Array.from(new Set(restaurants.map((r) => r.name))).map(
                        (name) => (
                          <DropdownMenuItem
                            key={name}
                            onSelect={() => setNameFilter(name)}
                          >
                            {name}
                          </DropdownMenuItem>
                        ),
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
                <TableHead className="text-customTeal w-1/6 text-left">
                  Menus
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center ml-2">
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onSelect={() => setMenuCountFilter("all")}
                      >
                        All
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setMenuCountFilter("0")}
                      >
                        No menus
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setMenuCountFilter("1-3")}
                      >
                        1-3 menus
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setMenuCountFilter("4+")}
                      >
                        4+ menus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
                <TableHead className="text-customTeal w-1/6 text-left">
                  Rating
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center ml-2">
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => setRatingFilter("all")}>
                        All Ratings
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setRatingFilter("4+")}>
                        4+ stars
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setRatingFilter("3-4")}>
                        3-4 stars
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setRatingFilter("0-3")}>
                        Below 3 stars
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
                <TableHead className="text-customTeal w-1/6 text-left">
                  County
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center ml-2">
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => setCountyFilter("all")}>
                        All Counties
                      </DropdownMenuItem>
                      {taiwanCounties.map((county) => (
                        <DropdownMenuItem
                          key={county}
                          onSelect={() => setCountyFilter(county)}
                        >
                          {county}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRestaurants.map((restaurant) => (
                <TableRow
                  key={restaurant.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleRestaurantClick(restaurant)} // Click to focus on a restaurant
                >
                  <TableCell className="w-2/5">{restaurant.name}</TableCell>
                  <TableCell className="w-1/6">
                    {restaurant.menuCount > 0 ? (
                      <div className="flex items-center">
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        {restaurant.menuCount}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          handleRequestMenu(restaurant.id, restaurant.name)
                        }
                        className="text-customTeal border-customTeal hover:bg-customTeal hover:text-white"
                        variant="nextButton"
                      >
                        Request Menu
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="w-1/6">
                    {restaurant.rating.toFixed(1)}
                  </TableCell>
                  <TableCell className="w-1/6">{restaurant.county}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <div className="flex justify-between mt-4">
            <Button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className="bg-customTeal text-white"
            >
              Previous
            </Button>
            <span>
              Showing {currentPage * 10 + 1}-
              {Math.min((currentPage + 1) * 10, restaurants.length)} of{" "}
              {restaurants.length}
            </span>
            <Button
              onClick={handleNextPage}
              disabled={isLastPage} // Disable Next button when on the last page (11-20)
              className="bg-customTeal text-white"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Map section */}
      <Card className="w-full lg:w-2/5 bg-gradient-to-br from-gray-50 to-gray-100 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center mb-4">
            <span className="text-customTeal">Restaurant Locations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoaded ? (
            <>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={
                  focusedRestaurant
                    ? {
                        lat: focusedRestaurant.latitude,
                        lng: focusedRestaurant.longitude,
                      }
                    : center
                }
                zoom={focusedRestaurant ? 16 : 14}
              >
                {focusedRestaurant ? (
                  <Marker
                    key={focusedRestaurant.id}
                    position={{
                      lat: focusedRestaurant.latitude,
                      lng: focusedRestaurant.longitude,
                    }}
                    title={focusedRestaurant.name}
                  />
                ) : (
                  filteredRestaurants.map((restaurant) => (
                    <Marker
                      key={restaurant.id}
                      position={{
                        lat: restaurant.latitude,
                        lng: restaurant.longitude,
                      }}
                      title={restaurant.name}
                    />
                  ))
                )}
              </GoogleMap>
              {focusedRestaurant && (
                <div className="mt-4 text-center">
                  <span className="text-gray-700">
                    Address: {focusedRestaurant.address}
                  </span>
                </div>
              )}
              <div className="mt-2 text-center text-sm text-gray-500">
                Click on a restaurant to zoom in. All restaurants are shown by
                default.
                <br />
                <Button
                  onClick={resetFocus}
                  size="sm"
                  className="mt-2 text-customTeal"
                >
                  Show All Restaurants
                </Button>
              </div>
            </>
          ) : (
            <div>Loading map...</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
