// app/(marketing)/find-restaurants/FindRestaurantsAndMenus.tsx

"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
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
import { Check, RefreshCw, ChevronDown, Info, MapPin, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api";
import {
  getMenuCountForRestaurant,
  getCachedRestaurantDetails,
  saveRestaurantDetails,
  getCachedRestaurantsForLocation,
  saveCachedRestaurantsForLocation,
  checkExistingMenuForRestaurant,
  
} from "@/app/services/firebaseFirestore"; // Update import
import { useRouter } from 'next/navigation'; 
import { Client as GoogleMapsClient } from "@googlemaps/google-maps-services-js";
import Image from "next/image";
import { counties, EnhancedCountyData } from "@/lib/data/counties";

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
import { getYelpBusinessWithPhotos } from "@/app/services/yelpService";
import { MenuWarningDialog } from "@/components/ui/menu-warning-dialog";
import axios from "axios";
import {
  Restaurant,
  CachedRestaurant,
 } from "@/app/services/firebaseFirestore";
import { EnhancedTownData, getTownsByCounty } from "@/lib/data/counties";
import { determineLocationDetails } from "@/app/services/locationService";
import { fetchWithError } from "@/app/utils/clientUtils";


interface LatLngLiteral {
  lat: number;
  lng: number;
}

interface SelectedRestaurant {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface GooglePlacePhoto {
  photo_reference: string;
  html_attributions?: string[];
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

const useDebouncedCallback = (callback: Function, delay: number) => {
  const timeoutRef = useRef<number | null>(null);

  const debouncedFunction = useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  return debouncedFunction;
};

const determineCounty = (countyName: string): string => {
  if (taiwanCounties.includes(countyName)) {
    return countyName;
  } else {
    return "Unknown County";
  }
};

async function getCountyName(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(`/api/maps/geocode?lat=${lat}&lng=${lng}`);
    const data = await response.json();

    if (data.error) throw new Error(data.error);
    return data.county || "Unknown County";
  } catch (error) {
    console.error("Error fetching county name:", error);
    return "Unknown County";
  }
}

export default function FindRestaurantsAndMenus() {
  const { userId } = useClerkAuth();
  const { firebaseToken, loading: authLoading, error: authError } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>(
    []
  );
  const [nameFilter, setNameFilter] = useState("all");
  const [countyFilter, setCountyFilter] = useState("all");
  const [menuCountFilter, setMenuCountFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
const [center, setCenter] = useState<LatLngLiteral>({
  // Default to center of Taiwan
  lat: 23.5737,
  lng: 121.0229,
});
  const [pinLocation, setPinLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [focusedRestaurant, setFocusedRestaurant] = useState<Restaurant | null>(
    null
  );
  const [menuImageUrl, setMenuImageUrl] = useState<string | null>(null);
  const router = useRouter();
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!, // Use the libraries constant
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // This function fetch menu image from Google Places API
  const fetchMenuImageFromGoogle = async (placeId: string, apiKey: string) => {
    try {
      const client = new GoogleMapsClient({});
      const response = await client.placeDetails({
        params: {
          place_id: placeId,
          fields: ["photos"],
          key: apiKey,
        },
      });

      if (response.data.result?.photos) {
        // Filter photos that might be menu images based on tags or descriptions
        const menuPhotos = response.data.result.photos.filter(
          (photo: GooglePlacePhoto) =>
            photo.html_attributions?.some(
              (attr: string) =>
                attr.toLowerCase().includes("menu") ||
                attr.toLowerCase().includes("食谱") ||
                attr.toLowerCase().includes("菜單")
            )
        );

        if (menuPhotos.length > 0) {
          return menuPhotos[0].photo_reference;
        }
      }
      return null;
    } catch (error) {
      console.error("Error fetching menu image from Google:", error);
      return null;
    }
  };

  const fetchNearbyRestaurants = useCallback(
    async (lat: number, lng: number) => {
      if (!userId || !firebaseToken) {
        console.log('Missing userId or firebaseToken');
        return;
      }

      try {
        setIsLoading(true);
        console.log('Fetching restaurants for:', { lat, lng });

        const response = await fetch(
          `/api/restaurants?lat=${lat}&lng=${lng}&type=full`,
          {
            headers: {
              Authorization: `Bearer ${firebaseToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received data:', {
          restaurantsCount: data.restaurants?.length,
          cached: data.cached,
          county: data.county
        });

        if (!data.restaurants) {
          throw new Error('No restaurants data received');
        }

        setRestaurants(data.restaurants);
        setFilteredRestaurants(data.restaurants);
        setCurrentPage(0);
        setIsInitialLoad(false);

      } catch (error) {
        console.error('Error fetching restaurants:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch restaurants');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        console.log('Fetch complete, states:', {
          isLoading: false,
          isRefreshing: false,
          restaurantsCount: restaurants.length
        });
      }
    },
    [userId, firebaseToken]
  );

 // Use the debounced version for map clicks
 const debouncedFetchRestaurants = useDebouncedCallback(
   fetchNearbyRestaurants,
   500
 );

  // Helper function to process and merge results
const processCombinedResults = async (
  googleResults: any[],
  yelpResults: any[],
  userId: string
): Promise<CachedRestaurant[]> => {
  const processedResults = new Map<string, CachedRestaurant>();

  // Add this at the start of the function
  const response = await fetch("/api/maps");
  const { apiKey } = await response.json();

  // Helper function to normalize restaurant names for comparison
  const normalizeString = (str: string) =>
    str.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Process Google results first as they're usually more reliable for location
  for (const googleResult of googleResults) {
    if (!googleResult?.name) continue;

    const normalizedName = normalizeString(googleResult.name);
    const latitude = googleResult.geometry?.location.lat;
    const longitude = googleResult.geometry?.location.lng;

    if (!latitude || !longitude) continue;

    const countyName = await getCountyName(latitude, longitude);
    const menuExists = await checkExistingMenuForRestaurant(googleResult.id);

    processedResults.set(normalizedName, {
      id: googleResult.id,
      name: googleResult.name,
      address: googleResult.vicinity || "Unknown address",
      latitude,
      longitude,
      rating: googleResult.rating || 0,
      menuCount: menuExists ? 1 : 0,
      county: determineCounty(countyName),
      source: "google",
      hasGoogleData: true,
      imageUrl: googleResult.photos?.[0]?.photo_reference
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${googleResult.photos[0].photo_reference}&key=${apiKey}`
        : "",
      hasMenu: menuExists,
    } as CachedRestaurant);
  }

  // Enhance with Yelp data
  for (const yelpResult of yelpResults) {
    if (!yelpResult?.name) continue;

    const normalizedName = normalizeString(yelpResult.name);
    const existing = processedResults.get(normalizedName);

    if (existing) {
      // Enhance existing Google data with Yelp data
      processedResults.set(normalizedName, {
        ...existing,
        yelpId: yelpResult.id,
        rating: Math.max(existing.rating, yelpResult.rating || 0),
        imageUrl: existing.imageUrl || yelpResult.image_url || "",
        hasYelpData: true,
        photos: yelpResult.photos || [],
      } as CachedRestaurant);
    } else {
      // Add new Yelp-only entry
      const latitude = yelpResult.coordinates?.latitude;
      const longitude = yelpResult.coordinates?.longitude;

      if (!latitude || !longitude) continue;

      const countyName = await getCountyName(latitude, longitude);
      const menuExists = await checkExistingMenuForRestaurant(yelpResult.id);

      processedResults.set(normalizedName, {
        id: yelpResult.id,
        name: yelpResult.name,
        address: yelpResult.location?.address1 || "Unknown address",
        latitude,
        longitude,
        rating: yelpResult.rating || 0,
        menuCount: menuExists ? 1 : 0,
        county: determineCounty(countyName),
        townName: "", // Add this initially empty, will be populated by determineLocationDetails
        source: "yelp",
        hasYelpData: true,
        yelpId: yelpResult.id,
        imageUrl: yelpResult.image_url || "",
        hasMenu: menuExists,
        photos: yelpResult.photos || []
      } as CachedRestaurant);
    }
  }

  return Array.from(processedResults.values());
};

  useEffect(() => {
    let isMounted = true; // Add mounted check

    const getCurrentLocation = async () => {
      if (!firebaseToken || !userId) {
        console.log('Waiting for auth...');
        return;
      }

      try {
        setIsLoadingLocation(true);
        console.log('Getting current location...');
        
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 30000
          });
        });

        if (!isMounted) return;

        const { latitude, longitude } = position.coords;
        console.log('Location obtained:', { latitude, longitude });
        
        setCenter({ lat: latitude, lng: longitude });
        await fetchNearbyRestaurants(latitude, longitude);
        setError(null);

      } catch (error) {
        console.error('Location error:', error);
        if (!isMounted) return;

        // Fallback to default location
        const fallbackCenter = { lat: 24.5601, lng: 120.8215 };
        console.log('Using fallback location:', fallbackCenter);
        
        setCenter(fallbackCenter);
        await fetchNearbyRestaurants(fallbackCenter.lat, fallbackCenter.lng);
        setError('Could not get your location. Showing default area.');
      } finally {
        if (isMounted) {
          setIsLoadingLocation(false);
          setIsInitialLoad(false);
          console.log('Location setup complete');
        }
      }
    };

    getCurrentLocation();

    return () => {
      isMounted = false;
    };
  }, [userId, firebaseToken, fetchNearbyRestaurants]);

// Also update handleRefreshLocation with similar improvements
const handleRefreshLocation = () => {
  setIsRefreshing(true);
  setError(null);

  const geolocationOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
  };

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const newCenter = { lat: latitude, lng: longitude };
      setCenter(newCenter);
      setIsLoading(true);

      Promise.resolve(fetchNearbyRestaurants(latitude, longitude))
        .catch((error: Error) => {
          console.error("Geolocation refresh error:", error);
          setError(error.message || "Failed to refresh location");
        })
        .finally(() => {
          setIsLoading(false);
          setIsRefreshing(false);
        });
    },
    (error) => {
      console.error("Geolocation error:", error);
      setIsRefreshing(false);
      const errorMessages = {
        1: "Location access denied. Please enable location services.",
        2: "Location unavailable. Please try again.",
        3: "Location request timed out. Please try again.",
      };
      setError(errorMessages[error.code as keyof typeof errorMessages] || "Failed to refresh location.");
    },
    geolocationOptions
  );
};

 // Update handleMapClick
 const handleMapClick = (event: google.maps.MapMouseEvent) => {
  const clickedLatLng = event.latLng;
  if (clickedLatLng) {
    const newCenter = {
      lat: clickedLatLng.lat(),
      lng: clickedLatLng.lng(),
    };
    setPinLocation(newCenter);
    setCenter(newCenter);
    setFocusedRestaurant(null);
    setIsLoading(true);
    
    Promise.resolve(fetchNearbyRestaurants(newCenter.lat, newCenter.lng))
      .catch((error: Error) => {
        console.error("Error in handleMapClick:", error);
        setError(error.message || "Failed to fetch restaurants");
      })
      .finally(() => {
        console.log('Finished loading restaurants');
        setIsLoading(false);
        setIsRefreshing(false);
      });
  }
};
 
  const handleRequestMenu = async (
    restaurantId: string,
    restaurantName: string,
    latitude: number,
    longitude: number
  ) => {
    if (!userId || !firebaseToken) {
      setError("User not authenticated");
      return;
    }

    try {
      setIsLoading(true);

      // Check existing menu
      const existingMenu = await checkExistingMenuForRestaurant(restaurantId);
      if (existingMenu) {
        router.push(`/menu-details/${restaurantId}`);
        return;
      }

      // Use the new combined Yelp function
      const yelpBusiness = await getYelpBusinessWithPhotos(
        restaurantName,
        latitude,
        longitude
      );

      const { townName } = await determineLocationDetails(latitude, longitude);

      if (!yelpBusiness || !yelpBusiness.photos?.length) {
        // Set the selected restaurant and show warning instead of throwing error
        setSelectedRestaurant({
          id: restaurantId,
          name: restaurantName,
          latitude,
          longitude,
          menuCount: 0,
          address: yelpBusiness?.location?.address1 || "Unknown address",
          county: determineCounty(yelpBusiness?.location?.address1 || "Unknown address"),
          rating: yelpBusiness?.rating || 0,
          townName: townName, // Use the determined town name
          photoUrl: undefined,
          menuImageUrl: undefined,
          menuId: undefined,
        });
        setShowWarning(true);
        return;
      }

      // Process the menu image through your existing pipeline
      const response = await fetch("/api/process-menu-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          restaurantId,
          restaurantName,
          menuImageUrl: yelpBusiness.photos[0],
          yelpBusinessId: yelpBusiness.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process menu image");
      }

      const result = await response.json();

      // Update Firestore restaurant details
      await saveRestaurantDetails(
        restaurantId,
        {
          name: restaurantName,
          rating: yelpBusiness.rating || 0,
          address: yelpBusiness.location.address1 || "",
          lastUpdated: new Date().toISOString()
        },
        yelpBusiness.photos?.[0]
      );

      // Update local state
      setRestaurants((prevRestaurants) =>
        prevRestaurants.map((r) =>
          r.id === restaurantId
            ? {
                ...r,
                menuCount: 1,
                menuImageUrl: result.imageUrl,
                menuId: result.menuId,
              }
            : r
        )
      );

      // Navigate to menu details
      router.push(`/menu-details/${result.menuId}`);
    } catch (error) {
      console.error("Error requesting menu:", error);
      setError(
        `Failed to request menu: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // function to handle opening menu details
  const handleOpenMenu = (restaurantId: string) => {
    router.push(`/menu-details/${restaurantId}`);
  };

  const handleRestaurantClick = (restaurant: Restaurant) => {
    setFocusedRestaurant(restaurant); // Focus only on clicked restaurant's marker
  };

  const resetFocus = () => {
    setFocusedRestaurant(null); // Reset the focused restaurant to show all markers
  };

  const [townFilter, setTownFilter] = useState("all");
const [availableTowns, setAvailableTowns] = useState<EnhancedTownData[]>([]);

  const handleFilter = useCallback(() => {
    const filtered = restaurants.filter((restaurant) => {
      const matchesName = nameFilter === "all" || restaurant.name === nameFilter;
      const matchesCounty = countyFilter === "all" || restaurant.county === countyFilter;
      const matchesTown = townFilter === "all" || restaurant.townName === townFilter;
      const matchesRating =
        ratingFilter === "all" ||
        (ratingFilter === "4+" && restaurant.rating >= 4) ||
        (ratingFilter === "3-4" && restaurant.rating >= 3 && restaurant.rating < 4) ||
        (ratingFilter === "0-3" && restaurant.rating < 3);
      const matchesMenuCount =
        menuCountFilter === "all" ||
        (menuCountFilter === "0" && restaurant.menuCount === 0) ||
        (menuCountFilter === "1-3" && restaurant.menuCount >= 1 && restaurant.menuCount <= 3) ||
        (menuCountFilter === "4+" && restaurant.menuCount >= 4);
  
      return matchesName && matchesCounty && matchesTown && matchesRating && matchesMenuCount;
    });
  
    setFilteredRestaurants(filtered.slice(currentPage * 10, (currentPage + 1) * 10));
  }, [
    restaurants,
    nameFilter,
    countyFilter,
    townFilter,
    ratingFilter,
    menuCountFilter,
    currentPage,
  ]);

  useEffect(() => {
    if (countyFilter !== "all") {
      const towns = getTownsByCounty(countyFilter);
      setAvailableTowns(towns);
    } else {
      setAvailableTowns([]);
      setTownFilter("all");
    }
  }, [countyFilter]);
  
  // Update existing filter effect
  useEffect(() => {
    handleFilter();
  }, [handleFilter]);

  const handleNextPage = () => {
    setCurrentPage((prev) => prev + 1); // Move to the next page
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0)); // Go to the previous page, but don't go below 0
  };

  if (authLoading || isInitialLoad) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
        <p className="ml-4 text-3xl font-semibold text-teal-900">Loading...</p>
      </div>
    );
  }

  if (authError || error) {
    return <div>Error: {authError || error}</div>;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-customTeal hover:bg-customTeal/90 text-white"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const isLastPage = currentPage === 1 || restaurants.length <= 10;

  return (
    <div className="h-full flex flex-col relative">
      {/* Loading Overlay */}
      {(isLoading || isRefreshing) && !isInitialLoad && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-xl">
      <div className="flex items-center space-x-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-customTeal"></div>
        <p className="text-lg font-semibold text-gray-700">
          {isRefreshing ? "Refreshing location..." : "Loading nearby restaurants..."}
        </p>
      </div>
    </div>
  </div>
)}
      <div className="flex-grow flex flex-col lg:flex-row gap-6">
        <Card className="w-full lg:w-3/5 bg-gradient-to-br from-gray-50 to-gray-100 shadow-xl overflow-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center mb-6">
              <motion.span className="relative inline-block">
                <span className="text-customTeal">Nearby Restaurants</span>
              </motion.span>
            </CardTitle>
            {/* Refresh Location Button */}
            <div className="flex justify-start items-center mb-4">
              <Button
                onClick={handleRefreshLocation}
                className="bg-customTeal hover:bg-customTeal/90 text-white"
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
                {isRefreshing ? "Refreshing..." : "Refresh Location"}
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="ml-3 h-6 w-6 text-customTeal" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Refreshes restaurants based on your current GPS location.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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
                  <SelectItem value="Unknown County">Unknown County</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Restaurant Table */}
            <Table className="table-auto w-full">
            <TableHeader>
  <TableRow className="bg-customTeal/10">
    <TableHead className="text-customTeal w-2/5 text-left hover:bg-customTeal/10">
      Restaurant
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center ml-2">
          <ChevronDown className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setNameFilter("all")}>
            All Restaurants
          </DropdownMenuItem>
          {Array.from(new Set(restaurants.map((r) => r.name))).map((name) => (
            <DropdownMenuItem key={name} onSelect={() => setNameFilter(name)}>
              {name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </TableHead>
    <TableHead className="text-customTeal w-1/6 text-center hover:bg-customTeal/10">
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
                  <TableHead className="text-customTeal w-1/5 text-center hover:bg-customTeal/10">
                    Rating
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center ml-2">
                        <ChevronDown className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onSelect={() => setRatingFilter("all")}
                        >
                          All Ratings
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setRatingFilter("4+")}
                        >
                          4+ stars
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setRatingFilter("3-4")}
                        >
                          3-4 stars
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setRatingFilter("0-3")}
                        >
                          Below 3 stars
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </TableHead>
                  <TableHead className="text-customTeal w-1/6 text-center hover:bg-customTeal/10">
                    Location
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center ml-2">
                        <ChevronDown className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => setCountyFilter("all")}>
                          All Counties
                        </DropdownMenuItem>
                        {counties.map((county: EnhancedCountyData) => (
                          <DropdownMenuItem
                            key={county.name}
                            onSelect={() => {
                              setCountyFilter(county.name);
                              const countyTowns = getTownsByCounty(county.name);
                              setTownFilter("all");
                              setAvailableTowns(countyTowns);
                            }}
                          >
                            {county.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableHead>
                  <TableHead className="text-customTeal w-1/6 text-center hover:bg-customTeal/10">
                    Town
                    <DropdownMenu>
                      <DropdownMenuTrigger 
                        className="inline-flex items-center ml-2"
                        disabled={countyFilter === "all"} // Disable if no county selected
                      >
                        <ChevronDown className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => setTownFilter("all")}>
                          All Towns
                        </DropdownMenuItem>
                        {availableTowns.map((town) => (
                          <DropdownMenuItem
                            key={town.name}
                            onSelect={() => setTownFilter(town.name)}
                          >
                            {town.name}
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
                    className="hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleRestaurantClick(restaurant)} // Click to focus on a restaurant
                  >
                    <TableCell className="w-2/5">
                      <span
                        className="cursor-pointer px-1 py-0.5 rounded transition duration-200
               hover:font-bold hover:text-customTealDark"
                      >
                        {restaurant.name}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="ml-4 group"
                            >
                              <MapPin className="inline h-4 w-4 text-gray-500 group-hover:text-teal-700 group-hover:scale-150 group-hover:shadow-lg transform transition duration-200" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View on Google Maps</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    <TableCell className="w-1/6 text-center">
                      {restaurant.menuCount > 0 ? (
                        <Button
                          size="sm"
                          onClick={() => handleOpenMenu(restaurant.id)}
                          className="bg-customTeal text-white hover:bg-customTeal/90"
                        >
                          Open Menu
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleRequestMenu(
                              restaurant.id,
                              restaurant.name,
                              restaurant.latitude,
                              restaurant.longitude
                            )
                          }
                          disabled={isLoadingMenu}
                          className="text-customTeal border-customTeal hover:bg-customTeal hover:text-white"
                          variant="nextButton"
                        >
                          {isLoadingMenu ? (
                            <div className="flex items-center">
                              <RefreshCw className="animate-spin mr-2 h-4 w-4" />
                              Fetching...
                            </div>
                          ) : (
                            "Fetch Menu"
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="w-1/6 text-center">
                      {restaurant.rating.toFixed(1)}
                    </TableCell>
                    <TableCell className="w-1/6 text-center">
                      {restaurant.county}
                    </TableCell>
                    <TableCell className="w-1/6 text-center">
                      {restaurant.townName}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            <div className="flex justify-between mt-4">
              <Button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className="bg-customTeal hover:bg-customTeal/90 text-white"
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
                className="bg-customTeal hover:bg-customTeal/90 text-white"
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Map section */}
        <Card className="w-full lg:w-2/5 bg-gradient-to-br from-gray-50 to-gray-100 shadow-xl flex flex-col">
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
                  onClick={handleMapClick}
                  options={{
                    disableDefaultUI: false,
                    clickableIcons: false,
                    mapTypeControl: false,
                    zoomControl: true,
                  }}
                >
                  {/* Show all restaurant markers unless focusing on one */}
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
                    restaurants.map((restaurant) => (
                      <Marker
                        key={restaurant.id}
                        position={{
                          lat: restaurant.latitude,
                          lng: restaurant.longitude,
                        }}
                        title={restaurant.name}
                        onClick={() => handleRestaurantClick(restaurant)}
                      />
                    ))
                  )}
                </GoogleMap>

                <div className="mt-4 space-y-4">
                  {!focusedRestaurant ? (
                    <p className="text-center text-sm text-gray-500">
                      Click on a restaurant marker to view details
                    </p>
                  ) : (
                    <>
                      {/* Restaurant Image */}
                      <div className="relative h-48 w-full rounded-lg overflow-hidden">
                        <Image
                          src={
                            focusedRestaurant.photoUrl ||
                            "/placeholder-restaurant.jpg"
                          }
                          alt={focusedRestaurant.name}
                          fill
                          className="object-cover transition-transform duration-300 hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      </div>

                      {/* Restaurant Details */}
                      <div className="text-center space-y-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {focusedRestaurant.name}
                        </h3>
                        <span className="text-gray-700 block">
                          Address: {focusedRestaurant.address}
                        </span>
                        {focusedRestaurant.rating > 0 && (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400" />
                            <span className="text-gray-700">
                              {focusedRestaurant.rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                        {focusedRestaurant.menuCount > 0 && (
                          <div className="text-sm text-gray-600">
                            Available Menus: {focusedRestaurant.menuCount}
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${focusedRestaurant.latitude},${focusedRestaurant.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-customTeal hover:underline flex items-center justify-center"
                          >
                            <MapPin className="mr-1 h-4 w-4" />
                            View on Google Maps
                          </a>
                          <Button
                            onClick={resetFocus}
                            size="sm"
                            className="w-auto mt-2 text-customTeal hover:bg-customTeal/10"
                          >
                            Show All Restaurants
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : loadError ? (
              <div className="flex justify-center items-center h-[400px] bg-gray-100">
                <p className="text-red-500">{String(loadError)}</p>
              </div>
            ) : (
              <div className="flex justify-center items-center h-[400px] bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-customTeal mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading map...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Add MenuWarningDialog here */}
      <MenuWarningDialog
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        restaurantName={selectedRestaurant?.name || ""}
        restaurantId={selectedRestaurant?.id || ""}
      />
    </div>
  );
} 
