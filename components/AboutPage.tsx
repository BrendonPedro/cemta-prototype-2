"use client";

import { type FC, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { MapPin, Camera, ChevronRight, Loader2 } from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

//Hooks and services
import { useAuth } from "@/components/AuthProvider";
import { useGeolocation } from '@/hooks/use-geolocation';

// Types & Interfaces
import { Restaurant } from "@/interfaces/restaurant/types";
import { RestaurantCardProps } from "@/interfaces/restaurant/types";


// Constants
import { FALLBACK_IMAGE, MENU_DEMO_IMAGE } from "@/app/constants/fallbackImages";

// Component: Restaurant Card
const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
}) => {
  // Get the appropriate image URL with fallback
  const imageUrl = restaurant.imageUrl || restaurant.photoUrl || FALLBACK_IMAGE;

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error("Image load error:", e);
    e.currentTarget.src = FALLBACK_IMAGE;
  };

  return (
    <Link href={`/restaurants/${restaurant.id}`} passHref>
      <Card className="w-full h-full overflow-hidden rounded-3xl shadow-xl cursor-pointer transition-all duration-300 hover:shadow-2xl transform hover:-translate-y-1">
        <div className="relative w-full h-56">
          <Image
            src={imageUrl}
            alt={restaurant.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 33vw"
            className="object-cover transition-transform duration-300"
            priority={true}
            onError={handleImageError}
          />
        </div>
        <CardContent className="p-6">
          <h3 className="text-2xl font-semibold mb-3 text-gray-800">
            {restaurant.name}
          </h3>
          <p className="text-gray-600 mb-4">{restaurant.address}</p>
          <div className="flex items-center text-gray-500 mb-4">
            <MapPin className="w-4 h-4 mr-2" />
            <span>{restaurant.county}</span>
          </div>
          <div className="flex items-center">
            <span className="text-yellow-400 mr-1">★</span>
            <span className="font-semibold">
              {restaurant.rating.toFixed(1)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

// Component: Loading Skeleton
const RestaurantSkeleton = () => (
  <div className="w-full h-full animate-pulse">
    <Card className="w-full h-full overflow-hidden rounded-3xl shadow-xl">
      <div className="relative w-full h-56 bg-gray-200" />
      <CardContent className="p-6">
        <div className="h-6 w-3/4 bg-gray-200 rounded mb-3" />
        <div className="h-4 w-full bg-gray-200 rounded mb-4" />
        <div className="flex items-center mb-4">
          <div className="w-4 h-4 bg-gray-200 rounded-full mr-2" />
          <div className="h-4 w-1/4 bg-gray-200 rounded" />
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-200 rounded-full mr-2" />
          <div className="h-4 w-1/6 bg-gray-200 rounded" />
        </div>
      </CardContent>
    </Card>
  </div>
);

// Main Component: About Page
export default function AboutPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const { firebaseToken } = useAuth();
  
  const { position, error: locationError, isLoading: locationLoading } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 300000, // 5 minutes cache
  });

  useEffect(() => {
    async function fetchRestaurants() {
      if (!position) return;

      // Check cache first
      const cacheKey = `restaurants-${position.coords.latitude}-${position.coords.longitude}`;
      const cached = sessionStorage.getItem(cacheKey);
      
      if (cached) {
        setRestaurants(JSON.parse(cached));
        return;
      }

      setIsFetching(true);
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(firebaseToken && { 'Authorization': `Bearer ${firebaseToken}` })
        };

        const { data } = await axios.get(
          `/api/restaurants`,
          {
            params: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              limit: 20,
              type: 'top_rated'
            },
            headers
          }
        );

        const topRestaurants = data.restaurants
          .sort((a: Restaurant, b: Restaurant) => b.rating - a.rating)
          .slice(0, 9);

        // Cache the results
        sessionStorage.setItem(cacheKey, JSON.stringify(topRestaurants));
        setRestaurants(topRestaurants);
      } catch (err) {
        console.error("Error fetching restaurants:", err);
        setError("Unable to fetch nearby restaurants. Please try again later.");
        setRestaurants([]);
      } finally {
        setIsFetching(false);
      }
    }

    fetchRestaurants();
  }, [position, firebaseToken]);

  // Combined loading state
  const isLoading = locationLoading || isFetching;

  // Render Methods
  const renderCarousel = () => (
    <Carousel
      opts={{
        align: "start",
        loop: false,
        skipSnaps: false,
        dragFree: false,
      }}
      className="w-full relative group"
    >
      <CarouselContent>
        {restaurants.map((restaurant) => (
          <CarouselItem key={restaurant.id}>
            <RestaurantCard restaurant={restaurant} />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );

  const renderLoadingState = () => (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex items-center justify-center mb-8">
        <Loader2 className="w-8 h-8 text-customTeal animate-spin mr-2" />
        <span className="text-lg text-gray-600">
          Discovering nearby hotspots...
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <RestaurantSkeleton key={i} />
        ))}
      </div>
    </div>
  );

  // Update renderErrorState to handle both location and fetch errors
  const renderErrorState = () => {
    const errorMessage = locationError?.message || error || "An unexpected error occurred";
    
    return (
      <div className="text-center text-red-500 p-8 bg-red-50 rounded-lg">
        <p>{errorMessage}</p>
        <Button
          onClick={() => window.location.reload()}
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-6 py-12">
        {/* Trending Restaurants Section */}
        <section className="mb-20 relative">
          <div className="text-center mb-12">
            <h2 className="inline-block text-4xl font-bold bg-gradient-to-r from-customTeal via-customBlack to-customTeal bg-clip-text text-transparent animate-gradient relative">
              Trending Culinary Hotspots
            </h2>
          </div>

          <div className="w-full max-w-7xl mx-auto px-4 md:px-20">
            {isLoading ? (
              <div className="w-full max-w-5xl mx-auto">
                <div className="flex items-center justify-center mb-8">
                  <Loader2 className="w-8 h-8 text-customTeal animate-spin mr-2" />
                  <span className="text-lg text-gray-600">
                    {locationLoading 
                      ? "Finding your location..." 
                      : "Discovering nearby hotspots..."}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <RestaurantSkeleton key={i} />
                  ))}
                </div>
              </div>
            ) : locationError || error ? (
              renderErrorState()
            ) : restaurants.length > 0 ? (
              renderCarousel()
            ) : null}
          </div>
        </section>

        {/* Menu Translation Section */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-customBlack mb-10 text-center">
            Instant Menu Translation
          </h2>
          <Card className="p-8 rounded-3xl bg-gradient-to-br from-customTeal to-white">
            <div className="flex flex-col md:flex-row items-center">
              <div className="flex-1 mb-8 md:mb-0 md:mr-8">
                <h3 className="text-3xl font-semibold mb-6 text-customBlack">
                  Decode Any Menu in Seconds
                </h3>
                <p className="text-xl text-gray-600 mb-6">
                  Our AI-powered OCR technology translates Chinese menus
                  instantly, making your dining experience seamless.
                </p>
                <Link href="/menuAnalyzer">
                  <Button className="bg-gradient-to-r from-customTeal to-customBlack hover:from-customBlack hover:to-customTeal text-white rounded-full text-lg py-6 px-8 transition-all duration-300 transform hover:scale-105">
                    <Camera className="mr-2 h-5 w-5" /> Translate Now
                  </Button>
                </Link>
              </div>
              <div className="flex-1 relative w-[500px] h-[300px]">
                <Image
                  src={MENU_DEMO_IMAGE}
                  alt="Menu translation demo"
                  fill
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="rounded-3xl shadow-2xl transform -rotate-3 hover:rotate-0 transition-all duration-300 object-cover"
                />
                <div className="absolute top-4 right-4 bg-white bg-opacity-90 backdrop-blur-md rounded-full px-4 py-2 shadow-lg">
                  <span className="text-customTeal font-semibold">
                    中文 → English
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Community Section */}
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-customBlack mb-10 text-center">
            Join Our Foodie Community
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 rounded-3xl bg-gradient-to-br from-customTeal to-white transform transition-all duration-300 hover:scale-105">
              <h3 className="text-2xl font-semibold mb-4 text-customBlack">
                Share Your Culinary Adventures
              </h3>
              <p className="text-gray-600 mb-6">
                Rate restaurants, leave reviews, and connect with fellow food
                enthusiasts from around the globe.
              </p>
              <Button
                variant="nextButton"
                className="rounded-full hover:bg-customTeal hover:text-white transition-colors duration-300"
              >
                Explore the Forum <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
            <Card className="p-8 rounded-3xl bg-gradient-to-br from-white to-customTeal transform transition-all duration-300 hover:scale-105">
              <h3 className="text-2xl font-semibold mb-4 text-customBlack">
                Become a Translation Hero
              </h3>
              <p className="text-gray-600 mb-6">
                Help others by contributing to our ever-growing translation
                database and unlock exclusive perks.
              </p>
              <Button
                variant="nextButton"
                className="rounded-full hover:bg-customTeal hover:text-white transition-colors duration-300"
              >
                Join the Team <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Card>
          </div>
        </section>

        {/* User Journey Section */}
        <section>
          <h2 className="text-4xl font-bold text-customBlack mb-10 text-center">
            Embark on Your Culinary Journey
          </h2>
          <Card className="p-8 rounded-3xl bg-white shadow-xl">
            <Tabs defaultValue="foodie" className="w-full">
              <TabsList className="grid w-full grid-cols-3 rounded-full bg-gray-100 p-2">
                <TabsTrigger
                  value="foodie"
                  className="rounded-full data-[state=active]:bg-customTeal data-[state=active]:text-white"
                >
                  Food Explorer
                </TabsTrigger>
                <TabsTrigger
                  value="translator"
                  className="rounded-full data-[state=active]:bg-customTeal data-[state=active]:text-white"
                >
                  Translation Partner
                </TabsTrigger>
                <TabsTrigger
                  value="restaurant"
                  className="rounded-full data-[state=active]:bg-customTeal data-[state=active]:text-white"
                >
                  Restaurant Owner
                </TabsTrigger>
              </TabsList>
              <TabsContent value="foodie" className="mt-8">
                <h3 className="text-2xl font-semibold mb-4 text-customBlack">
                  Discover New Culinary Horizons
                </h3>
                <p className="text-gray-600 mb-6">
                  Embark on a gastronomic adventure, explore diverse cuisines,
                  and share your experiences with a global community of food
                  lovers.
                </p>
                <Button className="bg-gradient-to-r from-customTeal to-customBlack hover:from-customBlack hover:to-customTeal text-white rounded-full py-4 px-6 transition-all duration-300 transform hover:scale-105">
                  Start Your Foodie Journey
                  </Button>
              </TabsContent>
              <TabsContent value="translator" className="mt-8">
                <h3 className="text-2xl font-semibold mb-4 text-customBlack">
                  Bridge Culinary Cultures
                </h3>
                <p className="text-gray-600 mb-6">
                  Use your language skills to help others explore new cuisines.
                  Contribute translations and earn rewards while making a
                  difference.
                </p>
                <Button className="bg-gradient-to-r from-customTeal to-customBlack hover:from-customBlack hover:to-customTeal text-white rounded-full py-4 px-6 transition-all duration-300 transform hover:scale-105">
                  Become a Translation Partner
                </Button>
              </TabsContent>
              <TabsContent value="restaurant" className="mt-8">
                <h3 className="text-2xl font-semibold mb-4 text-customBlack">
                  Showcase Your Culinary Masterpieces
                </h3>
                <p className="text-gray-600 mb-6">
                  Put your restaurant on the global map. Reach food enthusiasts
                  from around the world and let your cuisine shine.
                </p>
                <Button className="bg-gradient-to-r from-customTeal to-customBlack hover:from-customBlack hover:to-customTeal text-white rounded-full py-4 px-6 transition-all duration-300 transform hover:scale-105">
                  List Your Restaurant
                </Button>
              </TabsContent>
            </Tabs>
          </Card>
        </section>
      </main>
    </div>
  );
}

/**
 * Script Summary and Documentation
 * ------------------------------
 * 
 * Purpose:
 * This is the About Page component of CEMTA.
 * It serves as an optional landing page or simply the About Page that showcases trending restaurants, menu translation features,
 * and community engagement opportunities.
 * 
 * Key Features:
 * 1. Location-based restaurant discovery
 * 2. Menu translation service promotion
 * 3. Community engagement sections
 * 4. User role-based journey paths
 * 
 * Component Structure:
 * - Main AboutPage component
 * - RestaurantCard subcomponent
 * - RestaurantSkeleton loading component
 * 
 * Dependencies:
 * - UI Components: shadcn/ui (Button, Card, Tabs, etc.)
 * - Icons: lucide-react
 * - Authentication: AuthProvider.tsx (uses Clerk and Firebase)
 * - Data Fetching: axios (for fetching restaurants)
 * - Routing: Next.js Link and Image components
 * 
 * External Integrations:
 * - Restaurant API (/api/restaurants/route.ts)
 * - Firebase Authentication (via AuthProvider)
 * - Geolocation API (via navigator.geolocation.getCurrentPosition - browser API)
 * 
 * State Management: (useState)
 * - restaurants: Array of nearby restaurants 
 * - error: Error state for API calls
 * 
 * Hook States: (useGeolocation)
 * - position: Current user position
 * - locationError: Geolocation-specific errors
 * - isLoading: Loading state for location
 * 
 * Related Components:
 * - MenuAnalyzer (/menuAnalyzer route - client component)
 * - Restaurant Details (/restaurants/[id] route - client component)
 * - AuthProvider (authentication context - uses Clerk and Firebase)
 * 
 * Style Dependencies:
 * - Tailwind CSS
 * - Custom gradients and animations
 * - Responsive design breakpoints
 * 
 * Future Considerations:
 * - Implement pagination for restaurant list
 * - Add caching for restaurant data
 * - Enhance error recovery mechanisms
 * - Add accessibility improvements
 * - Implement analytics tracking
 */