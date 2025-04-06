// Main entry point for Maps Service
import { geocodeService } from '@/app/services/maps/geocodeService';
import { placesService } from '@/app/services/maps/placesService';
import { locationService } from '@/app/services/maps/locationService';
import { cacheService } from '@/app/services/maps/cacheService';

export const mapsService = {
  // Location and geocoding services
  geocode: geocodeService.geocode,
  reverseGeocode: geocodeService.reverseGeocode,
  determineLocation: locationService.determineLocation,
  
  // Places services
  searchNearby: placesService.searchNearby,
  getPlaceDetails: placesService.getPlaceDetails,
  
  // Distance calculations
  calculateDistance: locationService.calculateDistance,
  
  // Cache management
  cache: cacheService
};

export type { 
  GeocodeResult,
  ReverseGeocodeResult,
  LocationResult
} from './types'; 