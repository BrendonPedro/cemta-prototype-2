// Main entry point for Maps Service
import { geocodeService } from './geocodeService';
import { placesService } from './placesService';
import { locationService } from './locationService';
import { cacheService } from './cacheService';

export const mapsService = {
  // Location and geocoding services
  geocode: geocodeService.geocode,
  reverseGeocode: geocodeService.reverseGeocode,
  determineLocation: locationService.determineLocation,
  calculateDistance: locationService.calculateDistance,
  normalizeCoordinates: locationService.normalizeCoordinates,
  
  // Places services
  searchNearby: placesService.searchNearby,
  getPlaceDetails: placesService.getPlaceDetails,
  isValidEstablishment: placesService.isValidEstablishment,
  
  // Cache management
  cache: cacheService
};

// Export individual services for direct access
export { geocodeService, placesService, locationService, cacheService };

// Export types
export type * from './types'; 