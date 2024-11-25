"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Search, Camera, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import axios from "axios";
import { useAuth } from "@/components/AuthProvider";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  latitude: number;
  longitude: number;
  imageUrl: string;
  hasMenu: boolean;
  yelpId?: string | null;
  hasYelpData?: boolean;
  source: "google" | "yelp";
  menuCount: number;
  county: string;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  isFirst?: boolean;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  isFirst = false,
}) => {
  const imageUrl = restaurant.imageUrl;
  const fallbackImage =
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1074&q=80";

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
            priority={true} // Add priority to all images for smoother loading
            onError={(e) => {
              console.error("Image load error:", e);
              (e.target as HTMLImageElement).src = fallbackImage;
            }}
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

export default function AboutPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { firebaseToken } = useAuth();

  useEffect(() => {
    const fetchNearbyRestaurants = async () => {
      try {
        setLoading(true);
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              maximumAge: 0,
              enableHighAccuracy: true,
            });
          }
        );

        const { latitude, longitude } = position.coords;
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (firebaseToken) {
          headers['Authorization'] = `Bearer ${firebaseToken}`;
        }

        const response = await axios.get(
          `/api/restaurants?lat=${latitude}&lng=${longitude}&limit=20&type=top_rated`,
          { headers }
        );

        // Sort restaurants by rating and get top 9
        const topRestaurants = response.data.restaurants
          .sort((a: Restaurant, b: Restaurant) => b.rating - a.rating)
          .slice(0, 9);

        setRestaurants(topRestaurants);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
        setError("Unable to fetch nearby restaurants. Please try again later.");
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyRestaurants();
  }, [firebaseToken]);

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-6 py-12">
        <section className="mb-20 relative">
          <div className="text-center mb-12">
            <h2 className="inline-block text-4xl font-bold bg-gradient-to-r from-customTeal via-customBlack to-customTeal bg-clip-text text-transparent animate-gradient relative">
              Trending Culinary Hotspots
            </h2>
          </div>

          {/* Enhanced Carousel Section */}
          <div className="w-full max-w-7xl mx-auto px-4 md:px-20">
            {loading ? (
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
            ) : error ? (
              <div className="text-center text-red-500 p-8 bg-red-50 rounded-lg">
                <p>{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  className="mt-4"
                >
                  Please Try Again by Clicking or Refreshing the Page
                </Button>
              </div>
            ) : (
              <Carousel
                opts={{
                  align: "start", // Important: use start alignment
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
            )}
          </div>
        </section>

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
                  src="https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
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
