// components/RestaurantPage.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
  getCachedRestaurantDetails,
  getMenusByRestaurantId,
} from "@/app/services/firebaseFirestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
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
import { getYelpBusinessWithPhotos } from "@/app/services/yelpService";
import Link from "next/link";
import {
  type Restaurant,
  type OpeningHours,
  type PriceLevel,
  type Photo,
  type MenuSummary,
  type YelpBusiness,
  type Location
} from "@/interfaces/restaurant/types";

// ======= Helper Functions (outside all components) =======
const formatDay = (day: number): string => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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

const formatYelpHours = (yelpHours: YelpBusiness["hours"]): OpeningHours | null => {
  if (!yelpHours?.[0]?.open) return null;

  const periods = yelpHours[0].open.map(h => ({
    open: { day: h.day, time: h.start },
    close: { day: h.day, time: h.end }
  }));

  const weekdayText = periods.map(period => {
    const day = formatDay(period.open.day);
    return `${day}: ${formatTime(period.open.time)} - ${formatTime(period.close.time)}`;
  });

  return {
    openNow: false,
    periods,
    weekdayText
  };
};

const formatPriceLevel = (level: string | undefined | null): PriceLevel | null => {
  if (!level) return null;
  if (level.includes('$')) return level as PriceLevel;
  return '$'.repeat(Number(level)) as PriceLevel;
};

const convertYelpHours = (yelpHours: YelpBusiness["hours"]): OpeningHours | null => {
  if (!yelpHours?.[0]?.open) return null;

  return {
    openNow: false,
    periods: yelpHours[0].open.map(h => ({
      open: { day: h.day, time: h.start },
      close: { day: h.day, time: h.end }
    })),
    weekdayText: yelpHours[0].open.map(h => 
      `${formatDay(h.day)}: ${formatTime(h.start)} - ${formatTime(h.end)}`
    )
  };
};

// ======= Types =======
interface RestaurantPageProps {
  restaurantId: string;
}

interface RestaurantPageState {
  details: Restaurant | null;
  menus: MenuSummary[];
  photos: Photo[];
  loading: boolean;
  error: string | null;
  activeTab: string;
  allPhotos: Set<string>;
}

interface RestaurantContentProps {
  details: Restaurant;
  photos: Photo[];
  menus: MenuSummary[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

interface YelpLocation {
  latitude: number;
  longitude: number;
}

// Add a helper function to convert between location formats
const convertLocation = (location: YelpLocation): Location => {
  return {
    lat: location.latitude,
    lng: location.longitude
  };
};

// ======= Restaurant Content Component =======
const RestaurantContent: React.FC<RestaurantContentProps> = ({
  details,
  photos,
  menus,
  activeTab,
  onTabChange,
}) => {
  // Render Methods
  const renderRestaurantInfo = () => (
    <div className="lg:w-1/3 space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">{details.name}</h1>
        <div className="flex items-center mt-2 text-gray-600">
          <Star className="h-5 w-5 text-yellow-400" />
          <span className="ml-2">{details.rating.toFixed(1)}</span>
          {details.priceLevel && (
            <span className="ml-4">{formatPriceLevel(details.priceLevel)}</span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <MapPin className="h-5 w-5 text-gray-400 mt-1" />
          <p className="text-gray-600">{details.address}</p>
        </div>

        {details.phone && (
          <div className="flex items-center space-x-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <p className="text-gray-600">{details.phone}</p>
          </div>
        )}

        {details.website && (
          <div className="flex items-center space-x-3">
            <Globe className="h-5 w-5 text-gray-400" />
            <a
              href={details.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-customTeal hover:underline"
            >
              Visit Website
            </a>
          </div>
        )}

{details.openingHours && (
  <div className="flex items-start space-x-3">
    <Clock className="h-5 w-5 text-gray-400 mt-1" />
    <div className="text-gray-600">
      {details.openingHours.weekdayText?.map((hours: string, index: number) => (
        <div key={index}>
          {hours}
        </div>
      ))}
      <div className={`text-sm font-medium ${
        details.openingHours.openNow ? 'text-green-600' : 'text-red-600'
      }`}>
        {details.openingHours.openNow ? '● Open Now' : '○ Closed'}
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );

  const renderPhotoCarousel = () => (
    <div className="lg:w-2/3">
      <Carousel className="w-full">
        <CarouselContent>
          {photos.map((photo, index) => (
            <CarouselItem key={index}>
              <div className="relative aspect-video w-full">
                <Image
                  src={photo.url || "/placeholder-restaurant.jpg"}
                  alt={`${details.name} - Photo ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
                  className="rounded-lg object-cover"
                  priority={index === 0}
                />
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {photo.source}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );

  const renderPhotosSection = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo, index) => (
        <div key={index} className="relative aspect-square">
          <Image
            src={photo.url}
            alt={`${details.name} - Photo ${index + 1}`}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="rounded-lg object-cover"
            priority={index < 4}
          />
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
            {photo.source}
          </div>
        </div>
      ))}
    </div>
  );

const renderMenusSection = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {menus.map((menu) => (
      <Link href={`/menu-details/${menu.id}`} key={menu.id}>
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">{menu.menuName}</h3>
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={menu.imageUrl || "/placeholder-restaurant.jpg"}
                alt={menu.menuName}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="rounded-lg object-cover"
              />
            </div>
          </CardContent>
        </Card>
      </Link>
    ))}
  </div>
);

  // Main Render
   return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex flex-col lg:flex-row gap-8">
        {renderPhotoCarousel()}
        {renderRestaurantInfo()}
      </div>

      <Tabs
        defaultValue="menus"
        className="w-full mt-12"
        value={activeTab}
        onValueChange={onTabChange}
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
          {renderMenusSection()}
        </TabsContent>

        <TabsContent value="photos" className="mt-6">
          {renderPhotosSection()}
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <p className="text-gray-600">Reviews coming soon.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ======= Main Restaurant Page Component =======
const RestaurantPage: React.FC<RestaurantPageProps> = ({ restaurantId }) => {
  const [state, setState] = useState<RestaurantPageState>({
    details: null,
    menus: [],
    photos: [],
    loading: true,
    error: null,
    activeTab: "menus",
    allPhotos: new Set(),
  });

  useEffect(() => {
    let mounted = true;
    const allPhotos = new Set<string>();

    async function fetchRestaurantData() {
      try {
        // First, get cached restaurant details
        const details = await getCachedRestaurantDetails(restaurantId);
        if (!details) {
          if (mounted) {
            setState((prev) => ({
              ...prev,
              error: "Restaurant not found",
              loading: false,
            }));
          }
          return;
        }

        // Add main restaurant image to photos set if it exists
        if (details.imageUrl) {
          allPhotos.add(details.imageUrl);
        }

        // Parallel fetch of menus
        const menusData = await getMenusByRestaurantId(restaurantId);

        // Add menu images to photos set
        menusData.forEach((menu) => {
          if (menu.imageUrl) {
            allPhotos.add(menu.imageUrl);
          }
        });

            // Only fetch from Yelp if we have location data
            let yelpData = null;
            const yelpLocation = details.location as unknown as YelpLocation;
            if (yelpLocation && !details.yelpId) {
              yelpData = await getYelpBusinessWithPhotos(
                details.name,
                yelpLocation.latitude,
                yelpLocation.longitude
              );


         // Add Yelp photos to the set
      if (yelpData?.photos) {
        yelpData.photos.forEach((url) => allPhotos.add(url));
      }
    }

    // Create photos array from all sources
    const photoArray: Photo[] = Array.from(allPhotos).map((url) => ({
      url,
      source: url.includes("yelp") ? "yelp" : "google",
    }));

    // Combine all data
    const restaurantData: Restaurant = {
      id: details.id,
      name: details.name,
      address: details.address,
      rating: details.rating,
      location: convertLocation(yelpLocation), // Convert location format
      county: details.county || '',
      townName: '', // Default value
      menuCount: details.menuCount || 0,
      
      // Optional fields with proper null handling
      phone: details.phone || null,
      website: details.website || null,
      priceLevel: formatPriceLevel(details.priceLevel),
      openingHours: yelpData ? convertYelpHours(yelpData.hours) : null,
      photos: photoArray.map(photo => photo.url),
      
      // Required boolean flags
      hasMenu: Boolean(details.menuCount),
      hasGoogleData: false,
      hasYelpData: Boolean(yelpData),
      contribution: false,
      hasDetailsFetched: true
    };

        // Update Yelp data
        if (yelpData) {
          restaurantData.phone = yelpData.display_phone || null;
          restaurantData.website = yelpData.url || null;
          restaurantData.priceLevel = formatPriceLevel(yelpData.price_level);
        }

        if (mounted) {
          setState({
            details: restaurantData,
            menus: menusData,
            photos: photoArray,
            loading: false,
            error: null,
            activeTab: "menus",
            allPhotos,
          });
        }
      } catch (error) {
        console.error("Error fetching restaurant data:", error);
        if (mounted) {
          setState((prev) => ({
            ...prev,
            error: "Failed to load restaurant data",
            loading: false,
          }));
        }
      }
    }

    fetchRestaurantData();

    return () => {
      mounted = false;
    };
  }, [restaurantId]);

  if (state.loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-customTeal"></div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-semibold text-red-800 mb-2">
            Error Loading Restaurant
          </h2>
          <p className="text-red-600">{state.error}</p>
        </div>
      </div>
    );
  }

  if (!state.details) {
    return <div>Restaurant not found</div>;
  }

  return (
    <RestaurantContent
      details={state.details}
      photos={state.photos}
      menus={state.menus}
      activeTab={state.activeTab}
      onTabChange={(value) =>
        setState((prev) => ({ ...prev, activeTab: value }))
      }
    />
  );
};

export default RestaurantPage;

