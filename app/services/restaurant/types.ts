import { Timestamp, WriteBatch } from 'firebase/firestore';
import { CONFIG } from '@/lib/database-builder/config';
import type { MenuData } from '@/app/services/menu/types';

// Price level type for restaurants
export type PriceLevel = '$' | '$$' | '$$$' | '$$$$';

// Basic location type used across the application
export interface Location {
    lat: number;
    lng: number;
  }

  export interface LocationCache {
    geohash: string;
    latitude: number;
    longitude: number;
    restaurants: CachedRestaurant[];
    firstCached: Date;
    lastUpdated: Date;
    expiresAt: Date;
  }
  
  // Opening hours type used by restaurants
  export interface OpeningHours {
    openNow?: boolean;
    periods?: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
    weekdayText?: string[];
  }
  
  // Core Restaurant type that all components will use
  export interface Restaurant {
    // Essential Information 
    id: string;
    name: string;
    address: string;
    rating: number;
  
    // Location Information 
    latitude: number;
    longitude: number; 
    county: string;
    townName: string;
    
    // Menu Information 
    menuCount: number;
    hasMenu?: boolean;
    menuId?: string;
    menuImageUrl?: string;
    
    // Media & Visual Content
    imageUrl?: string;
    photoUrl?: string;
    photos?: string[];  // For gallery view in details
    
    // Contact & Business Details
    priceLevel?: string | null; // e.g., '$' for budget, '$$$$' for luxury
    phone?: string | null;
    website?: string | null;
    openingHours?: OpeningHours | null;
    
    // Integration Data (for admin/backend use)
    hasGoogleData?: boolean;
    hasYelpData?: boolean;
    yelpId?: string | null;
    yelpRating?: number | null;
    placeId?: string;
    lastYelpSync?: string;
    
    // State Management
    contribution?: boolean;
    hasDetailsFetched?: boolean;
    createdAt?: string;
    lastUpdated?: string;
  }

  export interface SaveRestaurantOptions {
    imageUrl?: string;
    incrementalUpdate?: boolean;
    batch?: WriteBatch;
    updateCounts?: boolean;
    signal?: AbortSignal;
  }
  
  export interface SaveRestaurantResult {
    success: boolean;
    restaurantId: string;
    updates?: {
      countyCount: number;
      townCount: number;
    };
    error?: string;
  }
  
  
  export interface CountyTownPaths {
    countyPath: string;
    townPath: string;
    restaurantPath: string;
  }
  
  export const RESTAURANT_COLLECTIONS = {
    GLOBAL: CONFIG.FIRESTORE.COLLECTIONS.RESTAURANTS,
    COUNTY: CONFIG.FIRESTORE.COLLECTIONS.COUNTIES,
    TOWN: CONFIG.FIRESTORE.COLLECTIONS.TOWNS
  } as const;

//-----PROPS-----
export interface RestaurantCardProps {
    restaurant: Restaurant;
    showDetails?: boolean;  // For expandable cards
    onSelect?: (id: string) => void;  // For interactive lists
  }
  
  export interface RestaurantDetailsProps {
    restaurant: Restaurant;
    onReset?: () => void;
    showFullDetails?: boolean;  // For expanded/collapsed views
  }

//-----MENU-----
export interface MenuItemName {
  original: string;
  english: string;
  pinyin: string;
}

export interface MenuDescription {
  original?: string;
  english?: string;
}

export interface MenuItemPrice {
  amount: number;
  currency: string;
}

export interface MenuItem {
  name: MenuItemName;
  description?: MenuDescription;
  price?: MenuItemPrice;
  prices?: {
    [key: string]: string | number;
  };
  popular?: boolean;
  chef_recommended?: boolean;
  spice_level?: string;
  allergy_alert?: string;
  upgrades?: Array<{ name: string; price: string }>;
  notes?: string;
}

export interface MenuCategory {
  name: MenuItemName;
  items: MenuItem[];
}

export interface RestaurantInfo {
  name: MenuItemName;
  address: MenuItemName;
  operating_hours?: string;
  phone_number?: string;
  website?: string;
  social_media?: string;
  description: MenuItemName;
  additional_notes?: string;
  validation_status?: "community" | "restaurant" | "validator" | "cemta";
}



export interface MenuDetails {
  id: string;
  userId: string;
  restaurantId: string;
  menuName: string;
  imageUrl?: string;
  menuData: MenuData;
  timestamp: string | Date;
  restaurantName?: string;
  restaurantValidated?: boolean;
  validatorValidated?: boolean;
}

export interface MenuProcessingResponse {
  menuData: MenuData;
  processingId: string;
  cached: boolean;
  timestamp: string;
  restaurantId: string;
}

export interface SearchResult {
  id: string;
  restaurantName: string;
  location: string;
}

export interface MenuSummary {
  id: string;
  menuName: string | { original: string; english: string };
  imageUrl?: string;
  timestamp: Date;
}

export interface Photo {
    url: string;
    source: "google" | "yelp";
  }
  
  // Update YelpBusiness interface
  export interface YelpBusiness {
    id: string;
    name: string;
    photos: string[];
    rating: number;
    display_phone?: string;
    url?: string;
    price_level?: string;
    hours?: Array<{
      hours_type: string;
      open: Array<{
        day: number;
        start: string;
        end: string;
      }>;
    }>;
    location: {
      address1: string;
      city: string;
      state: string;
      country: string;
      zip_code: string;
    };
    coordinates: {
      latitude: number;
      longitude: number;
    };
  }

  export interface YelpErrorResponse {
    error: {
      code: string;
      description: string;
    };
  }
  
  export interface YelpBusinessResponse {
    id: string;
    name: string;
    image_url?: string;
    rating?: number;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    location?: {
      address1?: string;
      city?: string;
      state?: string;
    };
  }
  
  export interface YelpSearchResponse {
    businesses: YelpBusinessResponse[];
    total: number;
  }
  
  export type YelpApiResponse = YelpSearchResponse | YelpErrorResponse;

//-----CACHE-----
export interface CachedRestaurant extends Restaurant { // Added cache-specific fields
  // Essential Information 
  id: string;
  name: string;
  address: string;
  rating: number;

  // Location Information 
  latitude: number;
  longitude: number;  
  county: string;
  townName: string;
  
  // Menu Information 
  menuCount: number;
  hasMenu?: boolean;
  menuId?: string;
  menuImageUrl?: string;
  
  // Media & Visual Content
  imageUrl?: string;
  photoUrl?: string;
  photos?: string[];  // For gallery view in details
  
  // Contact & Business Details
  priceLevel?: string | null; // e.g., '$' for budget, '$$$$' for luxury
  phone?: string | null;
  website?: string | null;
  openingHours?: OpeningHours | null;
  
  // Integration Data (for admin/backend use)
  hasGoogleData?: boolean;
  hasYelpData?: boolean;
  yelpId?: string | null;
  yelpRating?: number | null;
  placeId?: string;
  lastYelpSync?: string;
  
  // State Management
  contribution?: boolean;
  hasDetailsFetched?: boolean;
  createdAt?: string;
  lastUpdated?: string;

  // Cache Management
  firstCached?: string | Date;
  lastAccessed?: string | Date;
  geohash?: string;
}

export interface VertexAiResult {
  menuData: MenuData;
  processingId: string;
  timestamp: string;
  restaurantId: string;
  restaurantName: string;
  imageUrl: string | null;
  restaurantValidated: boolean;
  validatorValidated: boolean;
}