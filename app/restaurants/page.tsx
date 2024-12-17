// app/restaurants/page.tsx

'use client';

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin, Star, Info } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { searchRestaurants } from "@/app/services/firebaseFirestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import ErrorBoundary from "@/components/ErrorBoundary";
import { getRestaurantImageProps, handleImageError } from "@/app/utils/imageHandling";
import { getRestaurantLink } from "@/app/utils/restaurantUtils";
import { getImageProps } from "@/app/utils/imageHandling";

// Types and Interfaces
import { 
  Restaurant, 
  Location, 
  YelpErrorResponse,
  YelpBusinessResponse,
  YelpSearchResponse,
  YelpApiResponse 
} from '@/interfaces/restaurant/types';


interface MapConfig {
  containerStyle: {
    width: string;
    height: string;
  };
  defaultCenter: Location;
  defaultZoom: number;
}

interface MapState {
  isLoaded: boolean;
  error: string | null;
}

// Map Configuration
const MAP_CONFIG: MapConfig = {
  containerStyle: {
    width: "100%",
    height: "400px",
  },
  defaultCenter: {
    lat: 24.5601,
    lng: 120.8215, // Default to Miaoli coordinates
  },
  defaultZoom: 14,
};

interface NearbyRestaurantResponse {
  id: string;
  name: string;
  address: string;
  imageUrl?: string;
  rating?: number;
  county?: string;
  latitude: number;
  longitude: number;
}


// Component for loading skeleton
const RestaurantSkeleton: React.FC = () => (
  <Card className="p-4 w-full">
    <div className="flex flex-col space-y-4">
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  </Card>
);

// Component: Restaurant Card - matching the style from AboutPage
const RestaurantCard = ({ restaurant }: { restaurant: Restaurant }) => {
  const handleMapClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${restaurant.name} ${restaurant.address}`
      )}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <Link 
      href={getRestaurantLink(restaurant)}
      prefetch={false}
      className="group"
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div className="relative h-48">
          <Image
            {...getImageProps(restaurant.imageUrl, restaurant.name, 'card')}
            fill
            onError={handleImageError}
            unoptimized={restaurant.imageUrl?.includes('yelp')}
          />

          {restaurant.hasYelpData && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              Yelp
            </div>
          )}
        </div>
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-2 line-clamp-1">
            {restaurant.name}
          </h3>
          <div className="flex items-center text-gray-600 mb-2">
            <button
              onClick={handleMapClick}
              className="group mr-2 p-1 hover:bg-gray-100 rounded-full transition-all duration-200"
            >
              <MapPin className="h-4 w-4 flex-shrink-0 text-gray-600 hover:text-customTeal transition-all duration-200 transform group-hover:scale-125" />
            </button>
            <div className="flex flex-col">
              <span className="line-clamp-1">{restaurant.county}</span>
              <span className="line-clamp-2 text-sm">{restaurant.address}</span>
            </div>
          </div>
          {restaurant.rating && restaurant.rating > 0 && (
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-400 mr-1 flex-shrink-0" />
              <span>{restaurant.rating.toFixed(1)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

function RestaurantsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [showMap, setShowMap] = useState(false);
  const [center, setCenter] = useState<Location>(MAP_CONFIG.defaultCenter);
  const [mapsApiKey, setMapsApiKey] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapState, setMapState] = useState<MapState>({
    isLoaded: false,
    error: null
  });
  const getImageUrl = (url: string | undefined): string => {
    if (!url) return "/placeholder-restaurant.jpg";
    try {
      // Validate URL
      new URL(url);
      return url;
    } catch {
      return "/placeholder-restaurant.jpg";
    }
  };

   // Method to handle geocoding
  const handleGeocoding = async (address: string) => {
    try {
      const response = await fetch(`/api/maps/geocode?address=${encodeURIComponent(address)}`);
      if (!response.ok) throw new Error('Geocoding failed');
      return await response.json();
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

    // Method to handle place details
    const handlePlaceDetails = async (placeId: string) => {
      try {
        const response = await fetch(`/api/maps/place-details?placeId=${placeId}`);
        if (!response.ok) throw new Error('Failed to fetch place details');
        return await response.json();
      } catch (error) {
        console.error('Place details error:', error);
        return null;
      }
    };

  // Map initialization effect
  useEffect(() => {
    async function initializeMap() {
      try {
        // First check if Google Maps is already loaded
        if (window.google?.maps) {
          console.log('Google Maps already loaded, skipping initialization');
          setMapState({
            isLoaded: true,
            error: null
          });
          return;
        }
  
        // If not loaded, fetch API key and initialize
        const response = await fetch("/api/maps");
        const data = await response.json();
  
        if (!data.apiKey) {
          throw new Error('Failed to load Maps API key');
        }
  
        const { Loader } = await import("@googlemaps/js-api-loader");
        const loader = new Loader({
          apiKey: data.apiKey,
          version: "weekly",
          libraries: ["places"],
          mapIds: [data.mapId],
          // Add a unique ID to prevent conflicts
          id: 'cemta-google-maps'
        });
  
        await loader.load();
        setMapState({
          isLoaded: true,
          error: null
        });
      } catch (error) {
        console.error("Error loading map:", error);
        setMapState({
          isLoaded: false,
          error: 'Failed to load map functionality'
        });
      }
    }
  
    initializeMap();
  }, []); // Empty dependency array means this only runs once on mount

  // Search term debouncing effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Restaurant fetching effect
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
        setRestaurants(results as Restaurant[]);
      } catch (err) {
        setError("Failed to fetch restaurants");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchRestaurants();
  }, [debouncedSearchTerm]);

  // Map click handler
  const handleMapClick = async (event: google.maps.MapMouseEvent) => {
    if (!event.latLng) return;
  
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
  
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/yelp/search?latitude=${lat}&longitude=${lng}&limit=20`
      );
  
      const data = await response.json() as YelpApiResponse;
  
      if (!response.ok) {
        // Check if it's an error response
        if ('error' in data) {
          throw new Error(data.error.description || 'Failed to fetch nearby restaurants');
        }
        throw new Error('Failed to fetch nearby restaurants');
      }
  
      // Type guard for successful response
      if (!('businesses' in data) || !Array.isArray(data.businesses)) {
        throw new Error('Invalid response format from server');
      }
  
      setRestaurants((prev) => {
        const newRestaurants: Restaurant[] = data.businesses.map((r: YelpBusinessResponse) => ({
          id: r.id,
          name: r.name,
          address: r.location?.address1 || 'Address unavailable',
          rating: r.rating || 0,
            
            latitude: r.coordinates?.latitude || 0,
            longitude: r.coordinates?.longitude || 0,
         
          county: r.location?.city || 'Location unavailable',
          townName: r.location?.state || 'Unknown',  
          menuCount: 0,
          hasMenu: false,
          hasGoogleData: false,
          hasYelpData: true,
          // Optional fields with null values
          priceLevel: null,
          phone: null,
          website: null,
          openingHours: null,
          // Required basic fields
          imageUrl: r.image_url || '/placeholder-restaurant.jpg',
          contribution: false,
          hasDetailsFetched: true
        } satisfies Restaurant));
      
        // Filter out invalid restaurants
        const validRestaurants = newRestaurants.filter(
          r => r.latitude !== 0 && r.longitude !== 0
        );
      
        const combined = [...prev, ...validRestaurants];
        
        // Remove duplicates based on ID
        return Array.from(
          new Map(combined.map((item) => [item.id, item])).values()
        );
      });
  
      setCenter({ lat, lng });
    } catch (error) {
      console.error("Error fetching nearby restaurants:", error);
      setError(
        error instanceof Error 
          ? error.message 
          : "Failed to fetch nearby restaurants. Please try again."
      );
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
          {mapState.isLoaded && window.google ? (
            <GoogleMap
              mapContainerStyle={MAP_CONFIG.containerStyle}
              center={center}
              zoom={MAP_CONFIG.defaultZoom}
              onClick={handleMapClick}
              options={{
                disableDefaultUI: false,
                clickableIcons: false,
                mapTypeControl: false,
                zoomControl: true,
                mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID // Add map ID here
              }}
            >
              {/* ... Markers ... */}
            </GoogleMap>
          ) : mapState.error ? (
            <div className="flex justify-center items-center h-[400px] bg-gray-100">
              <p className="text-red-500">{mapState.error}</p>
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
      <RestaurantCard key={restaurant.id} restaurant={restaurant} />
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
