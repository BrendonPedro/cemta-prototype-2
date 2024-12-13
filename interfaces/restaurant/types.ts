import { Timestamp, WriteBatch } from 'firebase/firestore';
import { CONFIG } from '@/lib/database-builder/config';

// Price level type for restaurants
export type PriceLevel = '$' | '$$' | '$$$' | '$$$$';

// Basic location type used across the application
export interface Location {
    lat: number;
    lng: number;
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
  english?: string;
  pinyin?: string;
}

export interface MenuItem {
  name: MenuItemName;
  description?: {
    original: string;
    english?: string;
  };
  price?: {
    amount: string;
    currency: string;
  };
  prices?: { [key: string]: string };
  spice_level?: string;
  popular?: boolean;
  chef_recommended?: boolean;
  allergy_alert?: string;
  notes?: string;
  upgrades?: Array<{
    name: string;
    price: string;
  }>;
}

export interface MenuCategory {
  name: MenuItemName;
  items: MenuItem[];
}

export interface MenuData {
  restaurant_info: {
    name: MenuItemName;
    address: MenuItemName;
    operating_hours?: string;
    phone_number?: string;
    website?: string;
    social_media?: string;
    description?: MenuItemName;
    additional_notes?: string;
  };
  categories: MenuCategory[];
  other_info?: string;
}

// Menu Document in Firestore
export interface MenuDocument {
  id: string;
  userId: string;
  restaurantId: string;
  menuName: string;
  imageUrl: string;
  menuData: MenuData;
  timestamp: string | Date;
  cached?: boolean;
  processingId?: string;
}

// For API Responses
export interface MenuProcessingResponse {
  menuData: MenuData;
  processingId: string;
  cached: boolean;
  timestamp: string;
  restaurantId: string;
}

// For Component Props
export interface MenuDisplayProps {
  menuData: MenuData | null;
  menuName: string;
  isEditing?: boolean;
  onEdit?: (menuData: MenuData) => void;
}

export interface Photo {
    url: string;
    source: "google" | "yelp";
  }
  
  // Add MenuSummary interface
  export interface MenuSummary {
    id: string;
    menuName: string;
    imageUrl?: string;
    timestamp: Date;
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
export interface CachedRestaurant {
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