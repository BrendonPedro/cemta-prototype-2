// lib/database-builder/types.ts

import type { Place, YelpBusiness } from './services/places';
import { 
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';

 
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
  createdAt?: string;
  source: {
    google: boolean;
    yelp: boolean;
  };
  townName: string;
  hasGoogleData?: boolean;  
  hasYelpData?: boolean;    
  hasMenu?: boolean;        
  imageUrl?: string;        
}

export interface OpeningHours {
  openNow: boolean;
  periods: {
    open: {
      day: number;
      time: string;
    };
    close: {
      day: number;
      time: string;
    };
  }[];
  weekdayText: string[];
}

export interface CachedRestaurant {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  menuCount: number;
  county: string;
  townName: string;
  source: 'google' | 'yelp';
  hasGoogleData: boolean;
  hasYelpData: boolean;
  imageUrl?: string;
  photoUrl?: string;  // Added
  menuImageUrl?: string;  // Added
  menuId?: string;  // Added
  hasMenu: boolean;
  contribution?: boolean;  // Added
  priceLevel?: string | null;
  phone?: string | null;
  website?: string | null;
  yelpId?: string | null;
  yelpRating?: number | null;
  openingHours?: OpeningHours | null;
  hasDetailsFetched?: boolean;  // Added to track fetch status
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

// interfaces for rate limiting and progress tracking
export interface FetchProgress {
  googleCallsMade: number;
  yelpCallsMade: number;
  restaurantsProcessed: number;
  totalFound: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  currentLocation: Location | null;
  error: string | null;
  lastBatchResults: Place[];
}

export interface GridProcessingOptions {
  maxGoogleCalls?: number;
  maxYelpCalls?: number;
  batchSize?: number;
  signal?: AbortSignal;
}

export interface BatchProcessingResult {
  results: Place[];
  progress: FetchProgress;
  error?: string;
}

// ProcessingStats includes progress tracking
export interface ProcessingStats {
  totalProcessed: number;
  successful: number;
  failed: number;
  cached: number;
  restaurants?: CachedRestaurant[];
  apiCalls: {
    google: number;
    yelp: number;
  };
  progress?: FetchProgress;
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

// interfaces for error handling
export interface ApiError {
  response?: {
    status: number;
    data?: any;
  };
  message: string;
}

export interface ProcessingError extends Error {
  response?: {
    status: number;
    data?: any;
  };
}

export interface ProcessingOptions {
  selectedTowns: string[];
  force?: boolean;
  updateExisting?: boolean;
  clearCache?: {
    enabled: boolean;
    scope: 'town' | 'all';
  };
  batchSize?: number;
  delayBetweenBatches?: number;
  firebaseToken?: string | null;  
  maxResults?: number;
  testMode?: boolean;
  checkCacheOnly?: boolean;
  signal?: AbortSignal;
  aborted?: boolean;
}

export interface SerializableCounty {
  name: string;
  chineseName: string;
  towns: Array<{
    name: string;
    chineseName: string;
    location: {
      lat: number;
      lng: number;
    };
    searchRadiusKm: number;
  }>;
}

export interface ImageProcessingConfig {
  maxRetries: number;
  retryDelay: number;
  maxConcurrent: number;
  baseUrl: string;
}

export interface ImageUploadMetadata {
  restaurantId: string;
  countyName: string;
  townName: string;
  type: 'restaurant' | 'menu' | 'processed' | 'yelp';
  source: 'google' | 'yelp' | 'user';
  filename?: string;
  contentType?: string;
}

export interface SingleUploadResponse {
  url: string;
}

export interface BatchUploadResponse {
  urls: string[];
}

export type { RestaurantDocument } from '@/app/services/firebaseFirestore';

export interface MonitoringStats {
  totalRestaurants: number;
  totalPhotos: number;
  totalMenus: number;
  countiesCovered: number;
  townsCovered: number;
  lastUpdated: Date;
  counties: CountyStats[];
}

export interface ProcessingProgress {
  totalDays: number;
  lastProcessed: {
    timestamp: Timestamp | Date;
    location: {
      lat: number;
      lng: number;
    };
  } | null;
  progress: {
    processed: number;
    total: number;
  };
}

export interface SearchMetrics {
  cachedCount: number;
  newPlaces: number;
  apiCalls: number;
  processingTime: number;
  totalResults: number;
}