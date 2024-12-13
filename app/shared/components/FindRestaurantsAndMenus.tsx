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
import { Check, RefreshCw, ChevronDown, Info, MapPin, Star, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/AuthProvider";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useJsApiLoader, GoogleMap, MarkerClusterer, Libraries } from "@react-google-maps/api";
import {
  getMenuCountForRestaurant,
  getCachedRestaurantDetails,
  saveRestaurant,
  getCachedRestaurantsForLocation,
  saveCachedRestaurantsForLocation,
  checkExistingMenuForRestaurant,
  batchUpdateRestaurants,
  getLocationCacheKey,
} from "@/app/services/firebaseFirestore";
import { useRouter } from 'next/navigation'; 
import { Client as GoogleMapsClient } from "@googlemaps/google-maps-services-js";
import Image from "next/image";
import { getImageProps } from '@/app/utils/imageHandling';
import { debounce } from "lodash";
import { useGeolocation } from '@/hooks/use-geolocation';

import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getYelpBusinessWithPhotos } from "@/app/services/yelpService";
import { MenuWarningDialog } from "@/components/ui/menu-warning-dialog";
import axios from "axios";
import { determineLocationDetails } from "@/app/services/locationService";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { RestaurantDetails } from "@/app/shared/components/RestaurantDetails";
import { calculateDistance } from "@/app/utils/locationUtils";
import { CONFIG } from "@/lib/database-builder/config";
import { Loader2 } from "lucide-react";
import { CachedRestaurant, Restaurant } from "@/interfaces/restaurant/types";

type LatLngLiteral = { lat: number; lng: number };

const DEFAULT_CENTER = {
  lat: 25.0330,
  lng: 121.5654
};

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};

declare global {
  interface Window {
    google: typeof google;
  }
}

const GOOGLE_MAPS_LIBRARIES: Libraries = ["places", "marker"];
const googleMapsConfig = {
  id: "google-map-script",
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  version: "weekly",
  libraries: GOOGLE_MAPS_LIBRARIES,
  mapIds: [process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID!],
  region: "TW",
  language: "zh-TW"
};

const mapOptions = {
  mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID,
  disableDefaultUI: true,
  clickableIcons: false,
  minZoom: 8,
  maxZoom: 20,
  mapTypeControl: false,
  fullscreenControl: false,
  zoomControl: true,
  streetViewControl: false,
  tilt: 0,
  heading: 0,
  gestureHandling: "greedy" as const,
  draggableCursor: "pointer",
  draggingCursor: "grabbing"
};

interface AdvancedMarkerProps {
  position: LatLngLiteral;
  onClick?: () => void;
  isSelected?: boolean;
  isUserLocation?: boolean;
  isSelectedLocation?: boolean;
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
      let pinColor: string;
      if (isUserLocation) pinColor = "#22C55E";
      else if (isSelectedLocation || isSelected) pinColor = "#4A90E2";
      else pinColor = "#FF0000";

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

const getGoogleMapsUrl = (restaurant: Restaurant) => {
  const searchQuery = encodeURIComponent(
    `${restaurant.name} ${restaurant.address} ${restaurant.county} ${restaurant.townName}`
  );
  return `https://www.google.com/maps/search/${searchQuery}/@${restaurant.latitude},${restaurant.longitude},17z`;
};

const MapWithErrorBoundary = ({
  center,
  handleMapClick,
  handleMapLoad,
  restaurants,
  locationEnabled,
  userLocation,
  pinLocation,
  isSameLocation,
  handleMarkerClick,
  selectedMarker,
  mapRef,
}: {
  center: LatLngLiteral;
  handleMapClick: (event: google.maps.MapMouseEvent) => void;
  handleMapLoad: (map: google.maps.Map) => void;
  restaurants: Restaurant[];
  locationEnabled: boolean;
  userLocation: LatLngLiteral | null;
  pinLocation: LatLngLiteral | null;
  isSameLocation: (loc1: LatLngLiteral | null, loc2: LatLngLiteral | null) => boolean;
  handleMarkerClick: (restaurant: Restaurant, position: LatLngLiteral) => void;
  selectedMarker: string | null;
  mapRef: React.RefObject<google.maps.Map | null>;
}) => {
  const { isLoaded, loadError } = useJsApiLoader(googleMapsConfig);

  if (loadError) {
    return (
      <div className="flex justify-center items-center h-[400px] bg-gray-100">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load Google Maps</p>
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

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-[400px] bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-customTeal mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
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
            {locationEnabled && userLocation && (
              <AdvancedMarker
                position={userLocation}
                title="Your Current Location"
                isUserLocation={true}
                map={mapRef.current}
              />
            )}

            {pinLocation && !isSameLocation(pinLocation, userLocation) && (
              <AdvancedMarker
                position={pinLocation}
                title="Selected Search Location"
                isSelectedLocation={true}
                map={mapRef.current}
              />
            )}
            
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
  );
};

export function FindRestaurantsAndMenus() {
  const initRef = useRef(false);
  const { position, error: geoError, isLoading: geoLoading } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0,
    watchPosition: false
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const { userId } = useClerkAuth();
  const { firebaseToken, loading: authLoading, error: authError } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [nameFilter, setNameFilter] = useState("all");
  const [menuCountFilter, setMenuCountFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [center, setCenter] = useState<LatLngLiteral>(DEFAULT_CENTER);
  const [pinLocation, setPinLocation] = useState<LatLngLiteral | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [focusedRestaurant, setFocusedRestaurant] = useState<Restaurant | null>(null);
  const router = useRouter();
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [isCacheLoading, setIsCacheLoading] = useState(false);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLngLiteral | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationStats, setLocationStats] = useState<{
    towns: Set<string>;
    counties: Set<string>;
  }>({
    towns: new Set<string>(),
    counties: new Set<string>()
  });

  const updateLocationStats = (restaurants: Restaurant[]) => {
    const newStats = {
      towns: new Set<string>(),
      counties: new Set<string>()
    };
    
    restaurants.forEach(restaurant => {
      if (restaurant.townName) newStats.towns.add(restaurant.townName);
      if (restaurant.county) newStats.counties.add(restaurant.county);
    });
    
    setLocationStats(newStats);
  };

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

  const fetchNearbyRestaurants = useCallback(async (lat: number, lng: number) => {
    if (!userId || !firebaseToken) {
      console.log('Missing userId or firebaseToken');
      return;
    }
  
    const cacheKey = getLocationCacheKey(lat, lng);
    
    try {
      setIsApiLoading(true);
      setIsCacheLoading(true);
  
      // Get cached results first
      const cachedResults = await getCachedRestaurantsForLocation(lat, lng);
      
      if (cachedResults?.length) {
        console.log(`Cache hit for ${cacheKey} - ${cachedResults.length} restaurants`);
        setRestaurants(cachedResults);
        setFilteredRestaurants(cachedResults.slice(0, 10));
        setIsApiLoading(false);
        setIsCacheLoading(false);
        return; // Exit early if we have cached data
      }
  
      // Only proceed with API call if no cache hit
      console.log(`Cache miss for ${cacheKey}`);
      console.log('💰 [COST] Making new API call for restaurants');
      const apiResponse = await fetch(
        `/api/restaurants?lat=${lat}&lng=${lng}&limit=${CONFIG.SEARCH.PRECISE.MAX_RESULTS}&type=full`,
        {
          headers: {
            Authorization: `Bearer ${firebaseToken}`,
            'Content-Type': 'application/json'
          },
        }
      );
  
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        if (data.restaurants?.length) {
          console.log(`API call summary for ${cacheKey}:`, {
            newResults: data.restaurants.length,
            totalResults: 0 // No existing results since this is a cache miss
          });
  
          // Save new results to cache only if they don't exist
          await saveCachedRestaurantsForLocation(lat, lng, data.restaurants);
          
          setRestaurants(data.restaurants);
          setFilteredRestaurants(data.restaurants.slice(0, 10));
        }
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch restaurants');
    } finally {
      setIsApiLoading(false);
      setIsCacheLoading(false);
      setIsLoading(false);
    }
  }, [userId, firebaseToken]);

  // Initialize location once auth is done
  useEffect(() => {
    if (authLoading) return;
    if (!userId || !firebaseToken) return;
    if (initRef.current) return; // prevent multiple initializations

    const initLocation = async () => {
      initRef.current = true;
      setIsLoading(true);
  
      try {
        if (geoError || !position || !position.coords) {
          console.log('Using default location (Taipei)');
          setUserLocation(null);
          setCenter(DEFAULT_CENTER);
          setPinLocation(DEFAULT_CENTER);
          setLocationEnabled(false);
          await fetchNearbyRestaurants(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
          return;
        }
  
        const { latitude, longitude } = position.coords;
        console.log('Setting coordinates:', { latitude, longitude });
  
        // Check Taiwan bounds
        if (latitude < 21.9 || latitude > 25.3 || longitude < 120.0 || longitude > 122.0) {
          console.warn('Using default Taipei location');
          setUserLocation(null);
          setCenter(DEFAULT_CENTER);
          setPinLocation(DEFAULT_CENTER);
          setLocationEnabled(false);
          await fetchNearbyRestaurants(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
          return;
        }
  
        const newLocation = { lat: latitude, lng: longitude };
        setUserLocation(newLocation);
        setCenter(newLocation);
        setPinLocation(newLocation);
        setLocationEnabled(true);
        await fetchNearbyRestaurants(latitude, longitude);
      } catch (error) {
        console.error('Initialization error:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize');
      } finally {
        setIsLoading(false);
      }
    };
  
    initLocation();
  }, [position, geoError, userId, firebaseToken, authLoading]);


  const handleLocationToggle = async (enabled: boolean) => {
    console.log('Location toggle:', enabled);
    
    if (enabled) {
      // If we don't currently have a good position, try using position again
      if (position && position.coords) {
        const { latitude, longitude } = position.coords;
        console.log('Enabling location from position:', { latitude, longitude });
        const newLocation = { lat: latitude, lng: longitude };
        setUserLocation(newLocation);
        setCenter(newLocation);
        setPinLocation(newLocation);
        setLocationEnabled(true);
        await fetchNearbyRestaurants(latitude, longitude);
        setLocationError(null);
      } else {
        setLocationError('Unable to get current location');
        setLocationEnabled(false);
      }
    } else {
      console.log('Switching to default location');
      setLocationEnabled(false);
      setUserLocation(null);
      setCenter(DEFAULT_CENTER);
      setPinLocation(DEFAULT_CENTER);
      await fetchNearbyRestaurants(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
      setLocationError(null);
    }
  };
  
  const handleRefreshLocation = async () => {
    setIsRefreshing(true);
    setLocationError(null);

    try {
      if (!position || !position.coords) {
        throw new Error('Unable to get current location. Please ensure location services are enabled.');
      }

      const { latitude, longitude } = position.coords;
      console.log('Refreshing location:', { latitude, longitude });

      const newLocation = { lat: latitude, lng: longitude };
      setUserLocation(newLocation);
      setCenter(newLocation);
      setPinLocation(newLocation);

      await fetchNearbyRestaurants(latitude, longitude);
      setLocationEnabled(true);
      setLocationError(null);
    } catch (error) {
      console.error('Location refresh error:', error);
      setLocationError(
        error instanceof Error 
          ? error.message 
          : 'Unable to refresh location. Please try again.'
      );

      if (!userLocation) {
        // fallback to default if no user location
        setLocationEnabled(false);
        setCenter(DEFAULT_CENTER);
        setPinLocation(DEFAULT_CENTER);
        await fetchNearbyRestaurants(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Fit bounds if restaurants available
    if (restaurants.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      restaurants.forEach((r) => {
        bounds.extend({ lat: r.latitude, lng: r.longitude });
      });
      if (userLocation) bounds.extend(userLocation);
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    } else {
      map.setCenter(userLocation || DEFAULT_CENTER);
      map.setZoom(14);
    }
  }, [restaurants, userLocation]);

  const handleMapClick = useCallback(
    debounce(async (event: google.maps.MapMouseEvent) => {
      const latLng = event.latLng;
      if (!latLng) return;
      
      const newLat = latLng.lat();
      const newLng = latLng.lng();
      
      setCenter({ lat: newLat, lng: newLng });
      setPinLocation({ lat: newLat, lng: newLng });
      
      setFocusedRestaurant(null);
      setSelectedMarker(null);
      
      // Set loading state before fetching
      setIsLoading(true);
      await fetchNearbyRestaurants(newLat, newLng);
    }, 300),
    [fetchNearbyRestaurants]
  );

  const isSameLocation = (loc1: LatLngLiteral | null, loc2: LatLngLiteral | null): boolean => {
    if (!loc1 || !loc2) return false;
    return Math.abs(loc1.lat - loc2.lat) < 0.000001 && 
           Math.abs(loc1.lng - loc2.lng) < 0.000001;
  };

  const handleMarkerClick = useCallback(async (
    restaurant: Restaurant, 
    position: LatLngLiteral
  ) => {
    try {
      setFocusedRestaurant(restaurant);
      setSelectedMarker(restaurant.id);
      setCenter(position); 
      
      if (mapRef.current) {
        mapRef.current.panTo(position);
        mapRef.current.setZoom(16);
      }

      if (!restaurant.hasDetailsFetched) {
        console.log(`💰 [COST] Fetching details for restaurant: ${restaurant.name}`);
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
      setIsLoadingMenu(true);

      const existingMenu = await checkExistingMenuForRestaurant(restaurantId);
      if (existingMenu) {
        router.push(`/menu-details/${restaurantId}`);
        return;
      }

      const yelpBusiness = await getYelpBusinessWithPhotos(
        restaurantName,
        latitude,
        longitude
      );

      const { county, townName } = await determineLocationDetails(latitude, longitude);

      if (!yelpBusiness || !yelpBusiness.photos?.length) {
        setSelectedRestaurant({
          id: restaurantId,
          name: restaurantName,
          latitude,
          longitude,
          menuCount: 0,
          address: yelpBusiness?.location?.address1 || "Unknown address",
          rating: yelpBusiness?.rating || 0,
          county,
          townName,
          photoUrl: undefined,
          menuImageUrl: undefined,
          menuId: undefined
        });
        setShowWarning(true);
        return;
      }

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

      await saveRestaurant({
        id: restaurantId,
        name: restaurantName,
        address: yelpBusiness.location.address1 || "",
        rating: yelpBusiness.rating || 0,
        latitude,
        longitude,
        county,
        townName,
        menuCount: 1,
        hasMenu: true,
        menuId: result.menuId,
        menuImageUrl: result.imageUrl,
        imageUrl: yelpBusiness.photos?.[0],
        photoUrl: yelpBusiness.photos?.[0],
        photos: yelpBusiness.photos,
        priceLevel: yelpBusiness.price_level || null,
        phone: yelpBusiness.display_phone || null,
        website: yelpBusiness.url || null,
        openingHours: yelpBusiness.hours ? {
          openNow: false,
          periods: yelpBusiness.hours[0]?.open.map(period => ({
            open: { day: period.day, time: period.start },
            close: { day: period.day, time: period.end }
          })) || [],
          weekdayText: []
        } : null,
        hasGoogleData: false,
        hasYelpData: true,
        yelpId: yelpBusiness.id,
        yelpRating: yelpBusiness.rating || null,
        placeId: undefined,
        contribution: false,
        hasDetailsFetched: true,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      } as Restaurant);

      setRestaurants((prevRestaurants) =>
        prevRestaurants.map((r) =>
          r.id === restaurantId
            ? {
                ...r,
                menuCount: 1,
                menuImageUrl: result.imageUrl,
                menuId: result.menuId,
                hasMenu: true
              } 
            : r
        )
      );

      router.push(`/menu-details/${result.menuId}`);
    } catch (error) {
      console.error("Error requesting menu:", error);
      setError(
        `Failed to request menu: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsLoadingMenu(false);
    }
  };

  const handleOpenMenu = (restaurantId: string) => {
    router.push(`/menu-details/${restaurantId}`);
  };

  const handleRestaurantClick = useCallback((restaurant: Restaurant) => {
    const newCenter = { lat: restaurant.latitude, lng: restaurant.longitude };
    setCenter(newCenter);
    setPinLocation(newCenter);
    setFocusedRestaurant(restaurant);
    setSelectedMarker(restaurant.id);
    if (mapRef.current) mapRef.current.setZoom(16);
  }, []);

  const handleRestaurantNameClick = (restaurant: Restaurant) => {
    handleRestaurantClick(restaurant);
    const position = { lat: restaurant.latitude, lng: restaurant.longitude };
    setCenter(position);
    if (mapRef.current) {
      mapRef.current.panTo(position);
    }
  };

  const resetFocus = () => {
    setFocusedRestaurant(null);
  };

  useEffect(() => {
    handleFilter();
  }, [handleFilter]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center space-x-2 h-screen">
        <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-customTeal border-t-transparent" />
          <span className="text-base font-medium text-gray-700">
            Loading nearby restaurants...
          </span>
        </div>
      </div>
    );
  }

  if (authError || error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{authError || error}</p>
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

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };
  
  const handleNextPage = () => {
    if ((currentPage + 1) * 10 < restaurants.length) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const isLastPage = currentPage === 1 || restaurants.length <= 10;

   return (
    <div className="h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-4 px-4 py-2 bg-white rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleRefreshLocation}
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
  
      {(isLoading || isRefreshing || (isApiLoading && isCacheLoading)) && (
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

            {restaurants.length === 0 && !isApiLoading && !isCacheLoading && !error && (
              <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-col items-center space-y-4">
                  <Search className="h-12 w-12 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-700">No Restaurants Found</h3>
                  <p className="text-gray-600 max-w-md">
                    {locationEnabled 
                      ? "We couldn't find any restaurants near your current location. Try adjusting your search area or refreshing the page."
                      : "Enable location services to find restaurants near you, or try refreshing the page."}
                  </p>
                  <Button
                    onClick={handleRefreshLocation}
                    className="mt-4 bg-customTeal hover:bg-customTeal/90 text-white"
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    {isRefreshing ? "Refreshing..." : "Refresh Results"}
                  </Button>
                </div>
              </div>
            )}

            {restaurants.length > 0 && (
              <Table className="table-auto w-full">
                <TableHeader>
                  <TableRow className="bg-customTeal/10">
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

                    <TableHead className="text-customTeal w-1/6 text-center px-4 py-2 hover:bg-customTeal/10 p-0">
                      County
                    </TableHead>

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
                        key={`${restaurant.id}-${index}`}
                        className="hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleRestaurantClick(restaurant)}
                      >
                        <TableCell className="w-2/5">
                          <div className="flex items-center gap-2">
                            <span
                              className="cursor-pointer px-1 py-0.5 rounded transition duration-200 hover:font-bold hover:text-customTealDark"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestaurantNameClick(restaurant);
                              }}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMenu(restaurant.id);
                              }}
                              className="bg-customTeal text-white hover:bg-customTeal/90"
                            >
                              Open Menu
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestMenu(
                                  restaurant.id,
                                  restaurant.name,
                                  restaurant.latitude,
                                  restaurant.longitude
                                );
                              }}
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
            )}

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
        disabled={(currentPage + 1) * 10 >= restaurants.length}
        className="bg-customTeal hover:bg-customTeal/90 text-white"
      >
        Next
      </Button>
    </div>
          </CardContent>
        </Card>

        <Card className="w-full lg:w-2/5 bg-gradient-to-br from-gray-50 to-gray-100 shadow-xl flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center mb-4">
              <span className="text-customTeal">Restaurant Locations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MapWithErrorBoundary
              center={center}
              handleMapClick={handleMapClick}
              handleMapLoad={handleMapLoad}
              restaurants={restaurants}
              locationEnabled={locationEnabled}
              userLocation={userLocation}
              pinLocation={pinLocation}
              isSameLocation={isSameLocation}
              handleMarkerClick={handleMarkerClick}
              selectedMarker={selectedMarker}
              mapRef={mapRef}
            />
            
            <div className="mt-4 space-y-4">
              {!focusedRestaurant ? (
                <p className="text-center text-sm text-gray-500">
                  Click on a restaurant marker to view details
                </p>
              ) : (
                <>
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
                    {(focusedRestaurant.imageUrl || focusedRestaurant.photoUrl) && (
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                        {focusedRestaurant.hasGoogleData ? 'Google' : 'Yelp'}
                      </div>
                    )}
                  </div>
                  <RestaurantDetails 
                    restaurant={focusedRestaurant} 
                    onReset={resetFocus}
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <MenuWarningDialog
        isOpen={showWarning}
        onClose={() => setShowWarning(false)}
        restaurantName={selectedRestaurant?.name || ""}
        restaurantId={selectedRestaurant?.id || ""}
      />
    </div>
  );
}