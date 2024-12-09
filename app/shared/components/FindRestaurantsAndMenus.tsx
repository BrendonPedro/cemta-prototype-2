// app/(marketing)/find-restaurants/FindRestaurantsAndMenus.tsx

"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
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
import { useJsApiLoader, GoogleMap, Marker, MarkerClusterer } from "@react-google-maps/api";
import {
  getMenuCountForRestaurant,
  getCachedRestaurantDetails,
  saveRestaurant,
  getCachedRestaurantsForLocation,
  saveCachedRestaurantsForLocation,
  checkExistingMenuForRestaurant,
  
} from "@/app/services/firebaseFirestore"; // Update import
import { useRouter } from 'next/navigation'; 
import { Client as GoogleMapsClient } from "@googlemaps/google-maps-services-js";
import Image from "next/image";
import { counties, EnhancedCountyData } from "@/lib/data/counties";
import { clientConfig } from '@/config/googleMapsConfig';
import { getImageProps } from '@/app/utils/imageHandling';
import { debounce } from "lodash";


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
import { EnhancedTownData, getTownsByCounty } from "@/lib/data/counties";
import { determineLocationDetails } from "@/app/services/locationService";
import { fetchWithError } from "@/app/utils/clientUtils";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { RestaurantDetails } from "@/app/shared/components/RestaurantDetails";
import { calculateDistance } from "@/app/utils/locationUtils";
import type { Restaurant } from "@/lib/database-builder/types";
import { CONFIG } from "@/lib/database-builder/config";
import { Loader2 } from "lucide-react";
import { CachedRestaurant } from "@/interfaces/restaurant/types";

interface RestaurantDetails {
  restaurant: CachedRestaurant;
  onReset: () => void;
}

type LatLngLiteral = { lat: number; lng: number };

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

const DEFAULT_CENTER = {
  lat: 23.5737,
  lng: 121.0229 // Center of Taiwan
};

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};


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

const generateUniqueId = (restaurant: Restaurant, index: number) => 
  `${restaurant.id}-${index}-${restaurant.latitude}-${restaurant.longitude}`;


// Update the deduplicateRestaurants function to accept coordinates
const deduplicateRestaurants = (
  restaurants: Restaurant[],
  currentLat: number,
  currentLng: number
): Restaurant[] => {
  const seen = new Set<string>();
  return restaurants.filter(restaurant => {
    const key = `${restaurant.latitude.toFixed(5)},${restaurant.longitude.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return calculateDistance(currentLat, currentLng, restaurant.latitude, restaurant.longitude) <= 1000;
  });
};

// Update the global declarations at the top
declare global {
  interface Window {
    google: typeof google;
  }
}

// Simplified constants at the top
const GOOGLE_MAPS_LIBRARIES: ("marker" | "places")[] = ["marker", "places"];
const GOOGLE_MAPS_OPTIONS = {
  id: "google-map-script",
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  version: "beta",
  libraries: GOOGLE_MAPS_LIBRARIES,
  mapIds: [process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID!]
};

// Add map styling options
const mapOptions = {
  mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID,
  disableDefaultUI: false,
  clickableIcons: false,
  minZoom: 8,
  maxZoom: 20,
  mapTypeControl: false,
  fullscreenControl: false,
  tilt: 0,
  heading: 0,
  gestureHandling: "greedy" as const,
  draggableCursor: "pointer",
  draggingCursor: "grabbing"
};

// AdvancedMarker component props interface
interface AdvancedMarkerProps {
  position: LatLngLiteral;
  onClick?: () => void;
  isSelected?: boolean;
  isUserLocation?: boolean;
  isSelectedLocation?: boolean; // Add new prop
  title?: string;
  map: google.maps.Map | null | undefined;
}

const AdvancedMarker: React.FC<AdvancedMarkerProps> = ({ 
  position, 
  onClick, 
  isSelected,
  isUserLocation,
  isSelectedLocation,
  title, 
  map 
}) => {
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    async function createMarker() {
      if (!window.google || !map) return;

      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker") as any;

      // Determine pin color based on marker type
      let pinColor;
      if (isUserLocation) {
        pinColor = "#22C55E"; // Green for user location
      } else if (isSelectedLocation || isSelected) {
        pinColor = "#4A90E2"; // Blue for selected location or restaurant
      } else {
        pinColor = "#FF0000"; // Red for other restaurants
      }

      const pinView = new PinElement({
        background: pinColor,
        borderColor: "#FFFFFF",
        scale: isUserLocation ? 1.4 : 1.2,
      });

      const marker = new AdvancedMarkerElement({
        map,
        position,
        content: pinView.element,
        title,
      });

      if (onClick) {
        marker.addListener('click', onClick);
      }

      markerRef.current = marker;
    }

    createMarker();

    return () => {
      if (markerRef.current) {
        google.maps.event.clearInstanceListeners(markerRef.current);
        markerRef.current.map = null;
      }
    };
  }, [map, position, onClick, isSelected, isUserLocation, isSelectedLocation, title]);

  return null;
};

const LoadingState = () => (
  <div className="flex items-center justify-center space-x-2">
    <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
      <div className="animate-spin rounded-full h-5 w-5 border-2 border-customTeal border-t-transparent" />
      <span className="text-base font-medium text-gray-700">
        Loading nearby restaurants...
      </span>
    </div>
  </div>
);

// Update the getGoogleMapsUrl function
const getGoogleMapsUrl = (restaurant: Restaurant) => {
  // Create a search query with restaurant name and location
  const searchQuery = encodeURIComponent(
    `${restaurant.name} ${restaurant.address} ${restaurant.county} ${restaurant.townName}`
  );
  
  // Use latitude and longitude directly
  return `https://www.google.com/maps/search/${searchQuery}/@${restaurant.latitude},${restaurant.longitude},17z`;
};

export default function FindRestaurantsAndMenus() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const { userId } = useClerkAuth();
  const { firebaseToken, loading: authLoading, error: authError } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [nameFilter, setNameFilter] = useState("all");
  const [menuCountFilter, setMenuCountFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
const [center, setCenter] = useState<LatLngLiteral>({
  lat: 0,
  lng: 0
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
  const { isLoaded, loadError } = useJsApiLoader(clientConfig);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [isCacheLoading, setIsCacheLoading] = useState(false);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLngLiteral | null>(null);
   

   // Location permission check
   useEffect(() => {
    const checkLocationPermission = async () => {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionStatus(permission.state);
        setLocationEnabled(permission.state === 'granted');
        
        permission.addEventListener('change', () => {
          setPermissionStatus(permission.state);
          setLocationEnabled(permission.state === 'granted');
        });
      } catch (error) {
        console.error('Error checking location permission:', error);
        setLocationEnabled(false);
      }
    };

    checkLocationPermission();
  }, []);

  const geolocationOptions: PositionOptions = {
    enableHighAccuracy: true, // Request high accuracy
    timeout: 10000,          // 10 second timeout
    maximumAge: 0           // Don't use cached position
  };

  // Handle location toggle
  const handleLocationToggle = async (enabled: boolean) => {
    setLocationEnabled(enabled);
    if (enabled) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            geolocationOptions
          );
        });
        
        const newUserLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        console.log('New user location:', newUserLocation); // For debugging
        
        setUserLocation(newUserLocation);
        setCenter(newUserLocation);
        setPinLocation(newUserLocation);
        await fetchNearbyRestaurants(newUserLocation.lat, newUserLocation.lng);
        
        // Start watching position for updates
        const watchId = navigator.geolocation.watchPosition(
          (newPosition) => {
            const updatedLocation = {
              lat: newPosition.coords.latitude,
              lng: newPosition.coords.longitude
            };
            
            // Only update if position has changed significantly (more than 10 meters)
            if (calculateDistance(
              updatedLocation.lat,
              updatedLocation.lng,
              newUserLocation.lat,
              newUserLocation.lng
            ) > 10) {
              setUserLocation(updatedLocation);
              // Optionally update center and fetch new restaurants
              // setCenter(updatedLocation);
              // fetchNearbyRestaurants(updatedLocation.lat, updatedLocation.lng);
            }
          },
          (error) => console.error('Watch position error:', error),
          geolocationOptions
        );
        
        // Store the watch ID to clear it later
        return () => navigator.geolocation.clearWatch(watchId);
        
      } catch (error) {
        console.error('Error getting location:', error);
        const errorMessage = error instanceof GeolocationPositionError 
          ? getLocationErrorMessage(error.code)
          : 'Failed to get user location';
        setLocationError(errorMessage);
        setLocationEnabled(false);
      }
    } else {
      setUserLocation(null);
      setCenter(DEFAULT_CENTER);
      setPinLocation(DEFAULT_CENTER);
      await fetchNearbyRestaurants(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
    }
  };
  
  // Helper function to get meaningful error messages
  const getLocationErrorMessage = (code: number): string => {
    switch (code) {
      case GeolocationPositionError.PERMISSION_DENIED:
        return 'Location permission denied. Please enable location services in your browser settings.';
      case GeolocationPositionError.POSITION_UNAVAILABLE:
        return 'Unable to determine your location. Please try again.';
      case GeolocationPositionError.TIMEOUT:
        return 'Location request timed out. Please check your connection and try again.';
      default:
        return 'An unknown error occurred while getting your location.';
    }
  };

  // Move handleFilter declaration before it's used
  const handleFilter = useCallback(() => {
    const filtered = restaurants.filter((restaurant) => {
      const matchesName = nameFilter === "all" || restaurant.name === nameFilter;
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

      return matchesName && matchesRating && matchesMenuCount;
    });

    setFilteredRestaurants(filtered.slice(currentPage * 10, (currentPage + 1) * 10));
  }, [restaurants, nameFilter, ratingFilter, menuCountFilter, currentPage]);

  // Modified fetchNearbyRestaurants function
  const fetchNearbyRestaurants = useCallback(
    async (lat: number, lng: number) => {
      if (!userId || !firebaseToken) {
        console.log('Missing userId or firebaseToken');
        return;
      }

      try {
        setIsApiLoading(true);
        setIsCacheLoading(true);

        // Fetch cache and API results in parallel
        const [cachedResults, apiResponse] = await Promise.all([
          getCachedRestaurantsForLocation(lat, lng),
          fetch(
            `/api/restaurants?lat=${lat}&lng=${lng}&limit=${CONFIG.SEARCH.PRECISE.MAX_RESULTS}&type=full`,
            {
              headers: {
                Authorization: `Bearer ${firebaseToken}`,
                'Content-Type': 'application/json'
              },
            }
          )
        ]);

        // Process cached results immediately
        let nearbyResults = cachedResults?.filter(restaurant => 
          calculateDistance(lat, lng, restaurant.latitude, restaurant.longitude) <= CONFIG.SEARCH.PRECISE.RADIUS
        ) || [];

        if (nearbyResults.length > 0) {
          setRestaurants(nearbyResults);
          setFilteredRestaurants(nearbyResults.slice(0, 10));
          handleFilter();
        }
        setIsCacheLoading(false);

        // Process API results
        if (apiResponse.ok) {
          const data = await apiResponse.json();
          if (data.restaurants?.length) {
            // Merge and deduplicate results
            const allRestaurants = [...nearbyResults, ...data.restaurants];
            const uniqueRestaurants = Array.from(
              new Map(allRestaurants.map(r => [r.id, r])).values()
            )
              .sort((a, b) => {
                const distA = calculateDistance(lat, lng, a.latitude, a.longitude);
                const distB = calculateDistance(lat, lng, b.latitude, b.longitude);
                return distA - distB;
              })
              .slice(0, CONFIG.SEARCH.PRECISE.MAX_RESULTS);

            setRestaurants(uniqueRestaurants);
            setFilteredRestaurants(uniqueRestaurants.slice(0, 10));
            handleFilter();
          }
        }
      } catch (error) {
        console.error('Error fetching restaurants:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch restaurants');
      } finally {
        setIsApiLoading(false);
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    },
    [userId, firebaseToken, handleFilter]
  );

  // Add handleMapLoad function
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (restaurants.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      restaurants.forEach((restaurant) => {
        bounds.extend({ lat: restaurant.latitude, lng: restaurant.longitude });
      });
      map.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50
      });
    }
  }, [restaurants]);

  // Use the debounced version for map clicks
  const debouncedFetchRestaurants = useDebouncedCallback(
    fetchNearbyRestaurants,
    500
  );

  useEffect(() => {
    if (!isInitialized && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = { lat: latitude, lng: longitude };
          
          setUserLocation(newLocation);
          setCenter(newLocation);
          setPinLocation(newLocation);
          fetchNearbyRestaurants(latitude, longitude);
          setIsInitialized(true);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationError(getLocationErrorMessage(error.code));
          
          // Use default location only if not initialized
          if (!isInitialized) {
            const defaultLocation = { lat: 24.687604, lng: 120.871407 };
            setCenter(defaultLocation);
            setPinLocation(defaultLocation);
            fetchNearbyRestaurants(defaultLocation.lat, defaultLocation.lng);
            setIsInitialized(true);
          }
        },
        geolocationOptions
      );
    }
  }, [fetchNearbyRestaurants, isInitialized]);

  const handleRefreshLocation = async (showPrompt = false) => {
    setIsRefreshing(true);
    setError(null);
  
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          geolocationOptions
        );
      });
      
      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      
      setUserLocation(newLocation);
      setCenter(newLocation);
      setPinLocation(newLocation);
      setFocusedRestaurant(null);
      await fetchNearbyRestaurants(newLocation.lat, newLocation.lng);
      setLocationError(null);
      
    } catch (error) {
      console.error('Location error:', error);
      const errorMessage = error instanceof GeolocationPositionError 
        ? getLocationErrorMessage(error.code)
        : 'Unknown location error';
      setLocationError(errorMessage);
      
      // Add a small delay before falling back to default location
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setUserLocation(null);
      setCenter(DEFAULT_CENTER);
      setPinLocation(DEFAULT_CENTER);
      await fetchNearbyRestaurants(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
    } finally {
      setIsRefreshing(false);
    }
  };
      
 // Update handleMapClick to use debounce
 const handleMapClick = useCallback(
  debounce((event: google.maps.MapMouseEvent) => {
    const latLng = event.latLng;
    if (!latLng) return;
    
    const newLat = latLng.lat();
    const newLng = latLng.lng();
    
    // Keep the center and pin location updates
    setCenter({ lat: newLat, lng: newLng });
    setPinLocation({ lat: newLat, lng: newLng });
    
    fetchNearbyRestaurants(newLat, newLng);
    
    setFocusedRestaurant(null);
    setSelectedMarker(null);
  }, 300),
  [fetchNearbyRestaurants]
);

// Helper function to compare coordinates
const isSameLocation = (loc1: LatLngLiteral | null, loc2: LatLngLiteral | null): boolean => {
  if (!loc1 || !loc2) return false;
  return Math.abs(loc1.lat - loc2.lat) < 0.000001 && 
         Math.abs(loc1.lng - loc2.lng) < 0.000001;
};

// Add a new handler for marker clicks
const handleMarkerClick = useCallback(async (
  restaurant: Restaurant, 
  position: LatLngLiteral
) => {
  try {
    setFocusedRestaurant(restaurant);
    setSelectedMarker(restaurant.id);
    setCenter(position); // Ensure map centers on clicked marker
    
    if (mapRef.current) {
      mapRef.current.panTo(position);
      mapRef.current.setZoom(16);
    }

    // Only fetch additional details if not already fetched
    if (!restaurant.hasDetailsFetched) {
      const response = await fetch(
        `/api/restaurants?lat=${position.lat}&lng=${position.lng}&id=${restaurant.id}&type=details`,
        {
          headers: {
            Authorization: `Bearer ${firebaseToken}`,
          },
        }
      );

      if (!response.ok) {
        console.warn('Failed to fetch additional restaurant details');
        return;
      }

      const data = await response.json();
      if (data.restaurant) {
        const updatedRestaurant = {
          ...data.restaurant,
          hasDetailsFetched: true
        };
        
        setRestaurants(prev => prev.map(r => 
          r.id === restaurant.id ? updatedRestaurant : r
        ));
        setFocusedRestaurant(updatedRestaurant);
      }
    }
  } catch (error) {
    console.error('Error in handleMarkerClick:', error);
  }
}, [firebaseToken]);

 
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

      const { county, townName } = await determineLocationDetails(latitude, longitude);

      if (!yelpBusiness || !yelpBusiness.photos?.length) {
        // Set the selected restaurant and show warning instead of throwing error
        setSelectedRestaurant({
          id: restaurantId,
          name: restaurantName,
          latitude,
          longitude,
          menuCount: 0,
          address: yelpBusiness?.location?.address1 || "Unknown address",
          rating: yelpBusiness?.rating || 0,
          county, // Add this
          townName,
          photoUrl: undefined,
          menuImageUrl: undefined,
          menuId: undefined
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
      await saveRestaurant({
        // Essential Information 
        id: restaurantId,
        name: restaurantName,
        address: yelpBusiness.location.address1 || "",
        rating: yelpBusiness.rating || 0,
      
        // Location Information 
        latitude,
        longitude,
        county,
        townName,
      
        // Menu Information (required)
        menuCount: 0,
        hasMenu: false,
        menuId: undefined,
        menuImageUrl: undefined,
      
        // Media & Visual Content
        imageUrl: yelpBusiness.photos?.[0],
        photoUrl: yelpBusiness.photos?.[0],
        photos: yelpBusiness.photos,
      
        // Contact & Business Details
        priceLevel: yelpBusiness.price_level || null,
        phone: yelpBusiness.display_phone || null,
        website: yelpBusiness.url || null,
        openingHours: yelpBusiness.hours ? {
          openNow: false, // Yelp doesn't provide this directly
          periods: yelpBusiness.hours[0]?.open.map(period => ({
            open: { day: period.day, time: period.start },
            close: { day: period.day, time: period.end }
          })) || [],
          weekdayText: [] // Yelp doesn't provide this format
        } : null,
      
        // Integration Data
        hasGoogleData: false,
        hasYelpData: true,
        yelpId: yelpBusiness.id,
        yelpRating: yelpBusiness.rating || null,
        placeId: undefined,
      
        // State Management
        contribution: false,
        hasDetailsFetched: true,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      } as Restaurant);
      // Update local state
      setRestaurants((prevRestaurants) =>
        prevRestaurants.map((r) =>
          r.id === restaurantId
            ? {
                ...r,
                menuCount: 1,
                menuImageUrl: result.imageUrl,
                menuId: result.menuId,
                hasMenu: true
              } as Restaurant  // Add type assertion
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

  const handleRestaurantClick = useCallback((restaurant: Restaurant) => {
    // Center map on restaurant
    const newCenter = {
      lat: restaurant.latitude,
      lng: restaurant.longitude
    };
    
    setCenter(newCenter);
    setPinLocation(newCenter);
    setFocusedRestaurant(restaurant);
    setSelectedMarker(restaurant.id);
    
    // Ensure proper zoom level
    if (mapRef.current) {
      mapRef.current.setZoom(16);
    }
  }, []);

  const handleRestaurantNameClick = (restaurant: Restaurant) => {
    handleRestaurantClick(restaurant);
    
    // Pan to restaurant location
    const position = {
      lat: restaurant.latitude,
      lng: restaurant.longitude
    };
    setCenter(position);
    if (mapRef.current) {
      mapRef.current.panTo(position);
    }
  };

  const resetFocus = () => {
    setFocusedRestaurant(null); // Reset the focused restaurant to show all markers
  };

  
  // Filter effect
  useEffect(() => {
    handleFilter();
  }, [handleFilter]);

  const handleNextPage = () => {
    setCurrentPage((prev) => prev + 1); // Move to the next page
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0)); // Go to the previous page, but don't go below 0
  };

  // Update the loading state component
  const LoadingState = () => (
    <div className="flex items-center justify-center space-x-2">
      <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-customTeal border-t-transparent" />
        <span className="text-base font-medium text-gray-700">
          Loading nearby restaurants...
        </span>
      </div>
    </div>
  );

  // Update the main render condition
  if (authLoading || (isInitialLoad && !error)) {
    return (
      <div className="flex flex-col justify-center items-center h-screen space-y-4">
        <LoadingState />
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
      {/* Top Location Controls */}
      <div className="flex justify-between items-center mb-4 px-4 py-2 bg-white rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleRefreshLocation(true)}
                  className="bg-customTeal hover:bg-customTeal/90 text-white"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  {isRefreshing ? "Refreshing..." : "Refresh Location"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refreshes restaurants based on your current GPS location.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={locationEnabled}
              onCheckedChange={handleLocationToggle}
              className="data-[state=checked]:bg-customTeal"
            />
            <span className="text-sm text-gray-600">
              Location Services {locationEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
  
        <div className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-customTeal" />
          <span className="text-sm text-gray-600">
            {locationEnabled ? 'Using precise location' : 'Using default location'}
          </span>
        </div>
      </div>
  
      {/* Location Error Alert */}
      <AnimatePresence>
        {locationError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-4"
          >
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Location Error</AlertTitle>
              <AlertDescription>{locationError}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
  
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
  
      {/* Main Content */}
      <div className="flex-grow flex flex-col lg:flex-row gap-6">
        <Card className="w-full lg:w-3/5 bg-gradient-to-br from-gray-50 to-gray-100 shadow-xl overflow-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center mb-6">
              <motion.span className="relative inline-block">
                <span className="text-customTeal">Nearby Restaurants</span>
              </motion.span>
            </CardTitle>
            {/* Remove duplicate refresh button and keep just the Info tooltip */}
            <div className="flex justify-end items-center mb-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-6 w-6 text-customTeal" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle location services above to control location precision</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {/* Loading Overlay */}
            {(isApiLoading || isCacheLoading) && (
              <div className="absolute inset-0 bg-white/75 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-customTeal border-t-transparent" />
                  <span className="text-base font-medium text-gray-700">
                    Loading nearby restaurants...
                  </span>
                </div>
              </div>
            )}

            {/* Search bar for county */}
            
            {/* Restaurant Table */}
            <Table className="table-auto w-full">
            <TableHeader>
                <TableRow className="bg-customTeal/10">
                  {/* Restaurant Column */}
                  <TableHead className="text-customTeal w-2/5 text-left hover:bg-customTeal/10 p-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="w-full h-full px-4 py-2 flex items-center gap-1 outline-none">
                        <div className="flex items-center gap-1">
                          Restaurant
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[200px] ml-[200px]">
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

                {/* Menus Column */}
                <TableHead className="text-customTeal w-1/6 text-center hover:bg-customTeal/10 p-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-full h-full px-4 py-2 flex items-center justify-center outline-none">
                      <div className="flex items-center gap-1">
                        Menus
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      <DropdownMenuItem onSelect={() => setMenuCountFilter("all")}>
                        All
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setMenuCountFilter("0")}>
                        No menus
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setMenuCountFilter("1-3")}>
                        1-3 menus
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setMenuCountFilter("4+")}>
                        4+ menus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableHead>

                {/* Rating Column */}
                <TableHead className="text-customTeal w-1/12 text-center hover:bg-customTeal/10 p-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-full h-full px-4 py-2 flex items-center justify-center outline-none">
                      <div className="flex items-center gap-1">
                        Rating
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
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

                {/* County Column - No dropdown */}
                <TableHead className="text-customTeal w-1/6 text-center px-4 py-2 hover:bg-customTeal/10 p-0">
                  County
                </TableHead>

                {/* Town Column - No dropdown */}
                <TableHead className="text-customTeal w-1/6 text-center px-4 py-2 hover:bg-customTeal/10 p-0">
                  Town
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
  {filteredRestaurants
    .filter((restaurant, index, self) => 
      index === self.findIndex((r) => r.id === restaurant.id)
    )
    .map((restaurant, index) => (
      <TableRow
        key={generateUniqueId(restaurant, index)}
        className="hover:bg-gray-100 cursor-pointer"
        onClick={() => handleRestaurantClick(restaurant)}
      >
                    <TableCell className="w-2/5">
                      <div className="flex items-center gap-2">
                        <span
                          className="cursor-pointer px-1 py-0.5 rounded transition duration-200 hover:font-bold hover:text-customTealDark"
                          onClick={() => handleRestaurantNameClick(restaurant)}
                        >
                          {restaurant.name}
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={getGoogleMapsUrl(restaurant)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  window.open(
                                    getGoogleMapsUrl(restaurant),
                                    '_blank',
                                    'noopener,noreferrer'
                                  );
                                }}
                                className="group inline-flex items-center"
                              >
                                <MapPin className="h-4 w-4 text-gray-500 transition-all duration-200 transform 
                                  group-hover:text-customTeal group-hover:scale-125" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View on Google Maps</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
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
                    <TableCell className="w-1/12 text-center">
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
  center={center}
  zoom={14}
  onClick={handleMapClick}
  onLoad={handleMapLoad}
  options={mapOptions}
>
  <MarkerClusterer averageCenter enableRetinaIcons>
    {(clusterer) => (
      <>
        {/* User's location marker (green) - Always show when enabled */}
        {locationEnabled && userLocation && (
          <AdvancedMarker
            position={userLocation}
            title="Your Current Location"
            isUserLocation={true}
            map={mapRef.current}
          />
        )}

        {/* Selected location marker (blue) - Show only if different from user location */}
        {pinLocation && !isSameLocation(pinLocation, userLocation) && (
          <AdvancedMarker
            position={pinLocation}
            title="Selected Search Location"
            isSelectedLocation={true}
            map={mapRef.current}
          />
        )}
        
        {/* Restaurant markers */}
        {restaurants
          .slice(0, 20)
          .map((restaurant) => (
            <AdvancedMarker
              key={`marker-${restaurant.id}`}
              position={{
                lat: restaurant.latitude,
                lng: restaurant.longitude,
              }}
              onClick={() => handleMarkerClick(restaurant, {
                lat: restaurant.latitude,
                lng: restaurant.longitude
              })}
              isSelected={selectedMarker === restaurant.id}
              title={restaurant.name}
              map={mapRef.current}
            />
          ))}
      </>
    )}
  </MarkerClusterer>
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
    {...getImageProps(
      focusedRestaurant.imageUrl || focusedRestaurant.photoUrl,
      focusedRestaurant.name,
      'detail'
    )}
    fill
    onError={(e) => {
      const img = e.target as HTMLImageElement;
      img.src = '/placeholder-restaurant.jpg';
    }}
    unoptimized={focusedRestaurant.imageUrl?.includes('yelp')}
  />
        {/* Image source badge */}
        {(focusedRestaurant.imageUrl || focusedRestaurant.photoUrl) && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
            {focusedRestaurant.hasGoogleData ? 'Google' : 'Yelp'}
          </div>
        )}
      </div>

      {/* Restaurant Details Component */}
      <RestaurantDetails 
        restaurant={focusedRestaurant} 
        onReset={resetFocus}
      />
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