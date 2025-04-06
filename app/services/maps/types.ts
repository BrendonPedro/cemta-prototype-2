// Common types for Maps Service
import { LatLngLiteral } from '@googlemaps/google-maps-services-js';

export interface GeocodeResult {
  location: LatLngLiteral;
  formattedAddress: string;
  placeId: string;
}

export interface ReverseGeocodeResult {
  formattedAddress: string;
  placeId: string;
  county: string;
  townName: string;
  addressComponents: {
    [key: string]: string;
  };
}

export interface LocationResult {
  county: string;
  townName: string;
  coordinates: LatLngLiteral;
  formattedAddress?: string;
  placeId?: string;
  accuracy?: string;
  cached?: boolean;
}

export interface MapState {
  center: LatLngLiteral;
  zoom: number;
  timestamp: Date;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface RestaurantSearchParams {
  latitude: number;
  longitude: number;
  radius?: number;
  keyword?: string;
  type?: string;
  maxResults?: number;
} 