import { Timestamp } from 'firebase/firestore';
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
  latitude: number;
  longitude: number;
  coordinates: Coordinates;
  county: string;
  townName: string;
  restaurants: CachedRestaurant[];
  firstCached: number;
  lastAccessed: number;
  expiresAt: number;
  geohash?: string;
}

export interface SearchResults {
  restaurants: CachedRestaurant[];
  location: {
    lat: number;
    lng: number;
    county: string;
    townName: string;
  };
  stats: {
    fromCache: number;
    newlyFetched: number;
    withGooglePhotos: number;
    withYelpData: number;
  };
  duration: number;
} 