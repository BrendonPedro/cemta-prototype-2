// components/RestaurantPage.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
  getCachedRestaurantDetails,
  getMenusByRestaurantId,
  type RestaurantDetails,
  type MenuSummary,
  type Photo,
  type BusinessHours,
  type YelpBusiness
} from "@/app/services/firebaseFirestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Phone,
  Globe,
  Clock,
  Star,
  Menu as MenuIcon,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  getYelpBusinessWithPhotos
} from "@/app/services/yelpService";

interface RestaurantPageProps {
  restaurantId: string;
}


const RestaurantPage: React.FC<RestaurantPageProps> = ({ restaurantId }) => {
  const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null);
  const [menus, setMenus] = useState<MenuSummary[]>([]);
  const [activeTab, setActiveTab] = useState("menus");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

   useEffect(() => {
     async function fetchData() {
       try {
         setLoading(true);
         const restaurantDetails = await getCachedRestaurantDetails(
           restaurantId
         );

         if (!restaurantDetails) {
           setLoading(false);
           return;
         }

         const menusData = await getMenusByRestaurantId(restaurantId);

         // Fetch Yelp data if available
         let yelpData: YelpBusiness | null = null;
         if (restaurantDetails.yelpId && restaurantDetails.location) {
           yelpData = await getYelpBusinessWithPhotos(
             restaurantDetails.name,
             restaurantDetails.location.latitude,
             restaurantDetails.location.longitude
           );

           if (yelpData?.id) {
             const yelpPhotos = await getYelpBusinessPhotos(yelpData.id);
             if (yelpPhotos) {
               const formattedYelpPhotos: Photo[] = yelpPhotos.map((url) => ({
                 url,
                 source: "yelp",
               }));
               setPhotos((prev) => [...prev, ...formattedYelpPhotos]);
             }
           }
         }

         // Create properly typed restaurant details object
         const restaurantData: RestaurantDetails = {
           id: restaurantDetails.id,
           name: restaurantDetails.name,
           address: restaurantDetails.address,
           rating: restaurantDetails.rating,
           imageUrl: restaurantDetails.imageUrl,
           location: restaurantDetails.location,
           yelpId: restaurantDetails.yelpId,
           // Optional fields from Yelp
           phone: yelpData?.display_phone || restaurantDetails.phone,
           website: yelpData?.url || restaurantDetails.website,
           priceLevel: yelpData?.price_level || restaurantDetails.priceLevel,
           hours:
             restaurantDetails.hours ||
             yelpData?.hours?.[0]?.open.map((h: any) => ({
               day: formatDay(h.day),
               start: formatTime(h.start),
               end: formatTime(h.end),
             })),
         };

         setRestaurant(restaurantData);
         setMenus(menusData);
       } catch (error) {
         console.error("Error fetching restaurant data:", error);
       } finally {
         setLoading(false);
       }
     }

     fetchData();
   }, [restaurantId]);

   // Helper functions for formatting
   const formatDay = (day: number): string => {
     const days = [
       "Sunday",
       "Monday",
       "Tuesday",
       "Wednesday",
       "Thursday",
       "Friday",
       "Saturday",
     ];
     return days[day] || "Unknown";
   };

   const formatTime = (time: string): string => {
     if (time.length !== 4) return time;
     const hours = parseInt(time.slice(0, 2));
     const minutes = time.slice(2);
     const period = hours >= 12 ? "PM" : "AM";
     const formattedHours = hours % 12 || 12;
     return `${formattedHours}:${minutes} ${period}`;
   };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-customTeal"></div>
      </div>
    );
  }

  if (!restaurant) {
    return <div>Restaurant not found</div>;
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column - Photos Carousel */}
        <div className="lg:w-2/3">
          <Carousel className="w-full">
            <CarouselContent>
              {[restaurant.imageUrl, ...photos.map((p) => p.url)].map(
                (photo, index) => (
                  <CarouselItem key={index}>
                    <div className="relative aspect-video w-full">
                      <Image
                        src={photo || "/placeholder-restaurant.jpg"}
                        alt={`${restaurant.name} - Photo ${index + 1}`}
                        fill
                        className="rounded-lg object-cover"
                      />
                    </div>
                  </CarouselItem>
                )
              )}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>

        {/* Right Column - Restaurant Info */}
        <div className="lg:w-1/3 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              {restaurant.name}
            </h1>
            <div className="flex items-center mt-2 text-gray-600">
              <Star className="h-5 w-5 text-yellow-400" />
              <span className="ml-2">{restaurant.rating.toFixed(1)}</span>
              {restaurant.priceLevel && (
                <span className="ml-4">{restaurant.priceLevel}</span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-1" />
              <p className="text-gray-600">{restaurant.address}</p>
            </div>

            {restaurant.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <p className="text-gray-600">{restaurant.phone}</p>
              </div>
            )}

            {restaurant.website && (
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-gray-400" />
                <a
                  href={restaurant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-customTeal hover:underline"
                >
                  Visit Website
                </a>
              </div>
            )}

            {restaurant.hours && (
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-gray-400 mt-1" />
                <div className="text-gray-600">
                  {restaurant.hours.map((hour, index) => (
                    <div key={index}>
                      {hour.day}: {hour.start} - {hour.end}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs
        defaultValue="menus"
        className="w-full mt-12"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="menus" className="flex items-center gap-2">
            <MenuIcon className="h-4 w-4" />
            Menus ({menus.length})
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Photos ({photos.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menus" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {menus.map((menu) => (
              <Card key={menu.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">
                    {menu.menuName}
                  </h3>
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={menu.imageUrl || "/placeholder-menu.jpg"}
                      alt={menu.menuName}
                      fill
                      className="rounded-lg object-cover"
                    />
                  </div>
                  <Button className="mt-4 w-full">View Menu</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="photos" className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div key={index} className="relative aspect-square">
                <Image
                  src={photo.url}
                  alt={`${restaurant.name} - Photo ${index + 1}`}
                  fill
                  className="rounded-lg object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {photo.source}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <p className="text-gray-600">Reviews coming soon.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RestaurantPage;
