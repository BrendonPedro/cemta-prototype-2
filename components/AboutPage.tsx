"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Search, Camera, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSpring, animated } from "react-spring";
import { useDrag } from "@use-gesture/react";
import Image from "next/image";
import axios from "axios";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface Restaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  latitude: number;
  longitude: number;
  photo_reference: string;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  const imageUrl = restaurant.photo_reference
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${restaurant.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    : "https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80";

  return (
    <Card className="w-full h-full overflow-hidden rounded-3xl shadow-xl">
      <div className="relative w-full h-56">
        <Image
          src={imageUrl}
          alt={restaurant.name}
          layout="fill"
          objectFit="cover"
          onError={(e) => {
            console.error("Image load error:", e);
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1514933651103-005eec06c04b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80";
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
          <span>{restaurant.address}</span>
        </div>
        <div className="flex items-center">
          <span className="text-yellow-400 mr-1">★</span>
          <span className="font-semibold">{restaurant.rating.toFixed(1)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AboutPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNearbyRestaurants = async () => {
      try {
        setLoading(true);
        // Get user's current location
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          }
        );

        const { latitude, longitude } = position.coords;
        const response = await axios.get(
          `/api/nearby-restaurants?lat=${latitude}&lng=${longitude}&limit=5`
        );
        setRestaurants(response.data.restaurants);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching nearby restaurants:", error);
        setError("Failed to fetch nearby restaurants. Please try again later.");
        setLoading(false);
      }
    };

    fetchNearbyRestaurants();
  }, []);

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-6 py-12">
        <section className="text-center mb-20">
          <h1 className="text-5xl md:text-7xl font-bold mb-8 inline-block text-transparent bg-clip-text bg-gradient-to-r from-customBlack to-customTeal py-2">
            Revolutionizing the Dining Experience
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-10">
            Explore local cuisines, translate menus, and embark on global food
            adventures.
          </p>
          <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-4">
            <Input
              className="max-w-md rounded-full text-lg py-6 px-6"
              placeholder="Search for dishes, cuisines, or restaurants"
            />
            <Button className="bg-gradient-to-r from-customTeal to-customBlack hover:from-customBlack hover:to-customTeal text-white rounded-full text-lg py-6 px-8 transition-all duration-300 transform hover:scale-105">
              <Search className="mr-2 h-5 w-5" /> Explore Flavors
            </Button>
          </div>
        </section>
        <section className="mb-20">
          <h2 className="text-4xl font-bold text-customBlack mb-10 text-center">
            Trending Culinary Hotspots
          </h2>
          <div className="w-full max-w-md mx-auto">
            {loading && (
              <p className="text-center">Loading nearby restaurants...</p>
            )}
            {error && <p className="text-center text-red-500">{error}</p>}
            {!loading && !error && restaurants.length > 0 && (
              <Carousel>
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
              <div className="flex-1 relative">
                <Image
                  src="https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
                  alt="Menu translation demo"
                  width={500}
                  height={300}
                  className="rounded-3xl shadow-2xl transform -rotate-3 hover:rotate-0 transition-all duration-300"
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
