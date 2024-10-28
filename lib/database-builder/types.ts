// lib/database-builder/types.ts

export interface Location {
  lat: number;
  lng: number;
}

export interface TownData {
  name: string;
  location: Location;
  searchRadiusKm: number;
}

export interface CountyData {
  name: string;
  towns: TownData[];
}

export interface RestaurantData {
  id: string;
  name: string;
  address: string;
  location: Location;
  rating: number;
  priceLevel?: string;
  phone?: string;
  website?: string;
  googlePlaceId: string;
  yelpId?: string;
  yelpRating?: number;
  photos: string[];
  menuCount: number;
  lastUpdated: string;
  source: {
    google: boolean;
    yelp: boolean;
  };
}

// Add CachedRestaurant interface to match your existing firestore service
export interface CachedRestaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  latitude: number;
  longitude: number;
  menuCount: number;
  county: string;
  source: 'google' | 'yelp';
  hasMenu: boolean;
  imageUrl: string;
  yelpId?: string;
  hasYelpData?: boolean;
  hasGoogleData?: boolean;
}

export interface ProcessingStatus {
  countyName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  lastUpdated: Date;
  error?: string;
  stats?: ProcessingStats;
}

export interface ProcessingStats {
  totalProcessed: number;
  successful: number;
  failed: number;
  cached: number;
  restaurants?: CachedRestaurant[];  // Updated to use CachedRestaurant type
  apiCalls: {
    google: number;
    yelp: number;
  };
}

export interface CountyStats {
  name: string;
  restaurants: number;
  photos: number;
  menus: number;
  towns: Array<{
    name: string;
    restaurants: number;
    photos: number;
    menus: number;
  }>;
}

export interface ValidateSetupResult {
  success: boolean;
  status?: ProcessingStatus;
  error?: string;
}