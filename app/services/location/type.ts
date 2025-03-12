import { Timestamp } from 'firebase/firestore';
import { EnhancedCountyData, EnhancedTownData } from '@/lib/data/counties';
import { CachedRestaurant } from '@/app/services/restaurant/types';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationDetails {
  county: string;
  townName: string;
}

export interface LocationResponse extends LocationDetails {
  coordinates: Coordinates;
  formattedAddress?: string;
  placeId?: string;
  accuracy?: string;
  cached?: boolean;
}

export interface LocationCache {
  gridKey: string;
  timestamp: Timestamp | { seconds: number; nanoseconds: number } | number;
  geohash: string;
  county: string;
  restaurants: CachedRestaurant[];
  lastUpdated: {
    county: Timestamp | { seconds: number; nanoseconds: number } | number;
    restaurants: Timestamp | { seconds: number; nanoseconds: number } | number;
    images: Timestamp | { seconds: number; nanoseconds: number } | number;
  };
  cached?: boolean;
}

export interface NearestLocation {
  town: EnhancedTownData | null;
  county: EnhancedCountyData | null;
  distance: number;
}

export interface APIMetricsLog {
  timestamp: string;
  gridKey: string;
  cached: boolean;
  apis: {
    googlemaps: {
      places: number;
      geocoding: number;
      photos: number;
    };
    yelp: number;
  };
  restaurants: {
    total: number;
    fromCache: number;
    newlyFetched: number;
    withGooglePhotos: number;
    withYelpData: number;
  };
  duration: number;
}

export interface CacheTimestamps {
  timestamp: number;
  firstCached: number;
  lastAccessed: number;
  expiresAt: number;
}

export interface MapState {
    center: google.maps.LatLngLiteral;
    zoom: number;
    timestamp: Date;
  }

export interface LocationStats {
  towns: Set<string>;
  counties: Set<string>;
}