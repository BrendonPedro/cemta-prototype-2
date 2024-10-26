// app/restaurants/page.tsx

'use client';

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, MapPin, Star, Info } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { searchRestaurants } from "@/app/services/firebaseFirestore";
import type { EnhancedSearchResult } from "@/app/services/firebaseFirestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import ErrorBoundary from "@/components/ErrorBoundary";

interface Restaurant extends EnhancedSearchResult {
  id: string;
  latitude?: number;
  longitude?: number;
}

const mapContainerStyle = {
  width: "100%",
  height: "400px",
};

function RestaurantsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [showMap, setShowMap] = useState(false);
  const [center, setCenter] = useState({
    lat: 24.5601,
    lng: 120.8215, // Default to Miaoli coordinates
  });
    const [mapsApiKey, setMapsApiKey] = useState<string>("");
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    

  useEffect(() => {
    async function initializeMap() {
      try {
        const response = await fetch("/api/maps");
        const data = await response.json();

        if (data.apiKey) {
          setMapsApiKey(data.apiKey);

          // Initialize loader only once with the API key
          const { load } = require("@googlemaps/js-api-loader");
          const loader = new load({
            apiKey: data.apiKey,
            version: "weekly",
            libraries: ["places"],
          });

          try {
            await loader.load();
            setIsLoaded(true);
          } catch (error) {
            console.error("Error loading Google Maps:", error);
            setLoadError("Failed to load Google Maps");
          }
        }
      } catch (error) {
        console.error("Error fetching Maps API key:", error);
        setLoadError("Failed to load map functionality");
      }
    }

    initializeMap();
  }, []); // Empty dependency array - only run once on mount

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch restaurants when debounced search term changes
  useEffect(() => {
    async function fetchRestaurants() {
      if (!debouncedSearchTerm) {
        setRestaurants([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const results = await searchRestaurants(debouncedSearchTerm);
        setRestaurants(results);
      } catch (err) {
        setError("Failed to fetch restaurants");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchRestaurants();
  }, [debouncedSearchTerm]);

  // Handle map click to search for restaurants
  const handleMapClick = async (event: google.maps.MouseEvent) => {
    if (!event.latLng) return;

    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    try {
      setLoading(true);
      const response = await fetch(
        `/api/nearby-restaurants?lat=${lat}&lng=${lng}&limit=20`
      );

      if (!response.ok) throw new Error("Failed to fetch nearby restaurants");

      const data = await response.json();

      // Combine the newly fetched restaurants with existing ones
      setRestaurants((prev) => {
        const newRestaurants = data.restaurants.map((r: any) => ({
          id: r.id,
          restaurantName: r.name,
          location: r.address,
          imageUrl: r.imageUrl,
          rating: r.rating,
          county: r.county,
          latitude: r.latitude,
          longitude: r.longitude,
        }));

        // Combine and remove duplicates
        const combined = [...prev, ...newRestaurants];
        const unique = Array.from(
          new Map(combined.map((item) => [item.id, item])).values()
        );

        return unique;
      });

      setCenter({ lat, lng });
    } catch (error) {
      console.error("Error fetching nearby restaurants:", error);
      setError("Failed to fetch nearby restaurants. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const RestaurantSkeleton = () => (
    <Card className="p-4 w-full">
      <div className="flex flex-col space-y-4">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </Card>
  );

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-4xl mx-auto mb-12">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">
          Find Restaurants
        </h1>

        {/* Search section */}
        <div className="space-y-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search restaurants by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg shadow-sm"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>

          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => setShowMap(!showMap)}
              variant="nextButton"
              className="text-customTeal border-customTeal hover:bg-customTeal hover:text-white"
            >
              {showMap ? "Hide Map" : "Show Map"}
            </Button>
          </div>

          {/* Search Tips Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Can&apos;t find what you&apos;re looking for? Try searching on the
              map! Click anywhere on the map to discover restaurants in that
              area. This will fetch real-time data from Google and Yelp.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Map Section */}
      {showMap && (
        <div className="mb-8">
          <Card className="p-4">
            {isLoaded && window.google ? (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={14}
                onClick={handleMapClick}
                options={{
                  disableDefaultUI: false,
                  clickableIcons: false,
                  mapTypeControl: false,
                  zoomControl: true,
                }}
              >
                {restaurants
                  .filter((r) => r.latitude && r.longitude)
                  .map((restaurant) => (
                    <Marker
                      key={restaurant.id}
                      position={{
                        lat: restaurant.latitude!,
                        lng: restaurant.longitude!,
                      }}
                      title={restaurant.restaurantName}
                    />
                  ))}
              </GoogleMap>
            ) : loadError ? (
              <div className="flex justify-center items-center h-[400px] bg-gray-100">
                <p className="text-red-500">{loadError}</p>
              </div>
            ) : (
              <div className="flex justify-center items-center h-[400px] bg-gray-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-customTeal mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading map...</p>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-2 text-center">
              Click anywhere on the map to find restaurants in that area
            </p>
          </Card>
        </div>
      )}

      {/* Results Section */}
      {error && <div className="text-red-500 text-center mb-8">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => <RestaurantSkeleton key={i} />)
        ) : restaurants.length > 0 ? (
          restaurants.map((restaurant) => (
            <Link href={`/restaurants/${restaurant.id}`} key={restaurant.id}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer">
                <div className="relative h-48">
                  <Image
                    src={restaurant.imageUrl || "/placeholder-restaurant.jpg"}
                    alt={restaurant.restaurantName}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">
                    {restaurant.restaurantName}
                  </h3>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{restaurant.county || restaurant.location}</span>
                  </div>
                  {restaurant.rating && restaurant.rating > 0 && (
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span>{restaurant.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))
        ) : searchTerm ? (
          <div className="col-span-full text-center text-gray-500">
            No restaurants found matching &quot;{searchTerm}&quot;
            <br />
            Try searching on the map to find more restaurants!
          </div>
        ) : (
          <div className="col-span-full text-center text-gray-500">
            Start typing to search for restaurants or use the map to discover
            places nearby
          </div>
        )}
      </div>
    </div>
  );
}

export default function RestaurantsPageWrapper() {
  return (
    <ErrorBoundary>
      <RestaurantsPage />
    </ErrorBoundary>
  );
}
