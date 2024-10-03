'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Search, Camera, ChevronRight, LogIn } from "lucide-react";
import Link from "next/link";
import { useSpring, animated } from "react-spring";
import { useDrag } from "@use-gesture/react";
import Image from "next/image";

interface Restaurant {
  id: number;
  name: string;
  description: string;
  location: string;
  rating: number;
  image: string;
}

const restaurants: Restaurant[] = [
  {
    id: 1,
    name: "Gourmet Haven",
    description: "Experience culinary artistry with a modern twist",
    location: "Foodie District",
    rating: 4.8,
    image:
      "https://ik.imagekit.io/z5s6tr/v0/restaurant1.jpg?updatedAt=1684856153336",
  },
  {
    id: 2,
    name: "Spice Fusion",
    description: "A journey through exotic flavors and aromas",
    location: "Culinary Avenue",
    rating: 4.7,
    image:
      "https://ik.imagekit.io/z5s6tr/v0/restaurant2.jpg?updatedAt=1684856153336",
  },
  {
    id: 3,
    name: "Ocean's Bounty",
    description: "Fresh seafood delights in an elegant setting",
    location: "Harbor View",
    rating: 4.9,
    image:
      "https://ik.imagekit.io/z5s6tr/v0/restaurant3.jpg?updatedAt=1684856153336",
  },
];

interface RestaurantCardProps {
  restaurant: Restaurant;
  onSwipe: (direction: string) => void;
  style?: React.CSSProperties;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onSwipe,
  style,
}) => {
  const [{ x, rotate }, set] = useSpring(() => ({ x: 0, rotate: 0 }));

  const bind = useDrag(
    ({ down, movement: [mx], direction: [xDir], velocity }) => {
      const trigger = velocity[0] > 0.2;
      const rotation = mx / 10;
      set({ x: down ? mx : 0, rotate: down ? rotation : 0, immediate: down });
      if (!down && trigger) {
        onSwipe(xDir > 0 ? "right" : "left");
      }
    },
    { axis: "x" }
  );

  return (
    <animated.div
      {...bind()}
      style={{ ...style, x, rotate, touchAction: "none" }}
      className="absolute w-full h-full"
    >
      <Card className="w-full h-full overflow-hidden rounded-3xl shadow-xl">
        <Image
          src={restaurant.image}
          alt={restaurant.name}
          width={800}
          height={600}
          className="w-full h-56 object-cover"
        />
        <CardContent className="p-6">
          <h3 className="text-2xl font-semibold mb-3 text-gray-800">
            {restaurant.name}
          </h3>
          <p className="text-gray-600 mb-4">{restaurant.description}</p>
          <div className="flex items-center text-gray-500 mb-4">
            <MapPin className="w-4 h-4 mr-2" />
            <span>{restaurant.location}</span>
          </div>
          <div className="flex items-center">
            <span className="text-yellow-400 mr-1">★</span>
            <span className="font-semibold">
              {restaurant.rating.toFixed(1)}
            </span>
          </div>
        </CardContent>
      </Card>
    </animated.div>
  );
};

export default function AboutPage() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSwipe = (direction: string) => {
    console.log(`Swiped ${direction} on ${restaurants[currentIndex].name}`);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % restaurants.length);
  };

  return (
    <div className="min-h-screen">
      {/* Main Content */}
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
          <div className="relative h-[400px] w-full max-w-md mx-auto">
            {restaurants.map((restaurant, index) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onSwipe={handleSwipe}
                style={{ display: index === currentIndex ? "block" : "none" }}
              />
            ))}
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
                <Button className="bg-gradient-to-r from-customTeal to-customBlack hover:from-customBlack hover:to-customTeal text-white rounded-full text-lg py-6 px-8 transition-all duration-300 transform hover:scale-105">
                  <Camera className="mr-2 h-5 w-5" /> Translate Now
                </Button>
              </div>
              <div className="flex-1 relative">
                <Image
                  src="/api/placeholder/500/300"
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