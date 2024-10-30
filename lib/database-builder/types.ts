// lib/database-builder/types.ts

import type { Place, YelpBusiness } from './places';

export interface Geometry {
  location: Location;
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
  priceLevel?: string | null;  
  phone?: string | null;       
  website?: string | null;     
  googlePlaceId: string;
  yelpId?: string | null;      
  yelpRating?: number | null;  
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

export interface Location {
  lat: number;
  lng: number;
}

export interface PlaceGeometry {
  location: {
    lat: () => number;  // Google Places API returns location as functions
    lng: () => number;
  };
}

export interface PlacePhoto {
  photo_reference: string;
  height: number;
  width: number;
  html_attributions: string[];
}

export type { Place, YelpBusiness };