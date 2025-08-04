// Unified Maps hook
'use client';

import { useCallback } from 'react';
import { useMapsContext } from '@/app/contexts/MapsContext';
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';

interface UseMapsOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

export function useMaps(options: UseMapsOptions = {}) {
  // Get context values
  const context = useMapsContext();
  
  // Use context's values directly
  const { 
    isLoaded, 
    loadError, 
    state, 
    position, 
    geoError, 
    isLocating, 
    getUserLocation 
  } = context;
  
  // Geocode an address
  const geocodeAddress = useCallback(async (address: string) => {
    if (!isLoaded) return null;
    
    try {
      const response = await fetch(`/api/maps?operation=geocode&address=${encodeURIComponent(address)}`);
      if (!response.ok) throw new Error('Geocoding failed');
      return await response.json();
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }, [isLoaded]);

  // Search for nearby places
  const searchNearbyPlaces = useCallback(async (
    location: LatLngLiteral,
    radius: number = 1000
  ) => {
    if (!isLoaded) return [];
    
    try {
      const response = await fetch(
        `/api/maps?operation=searchNearby&lat=${location.lat}&lng=${location.lng}&radius=${radius}`
      );
      if (!response.ok) throw new Error('Search failed');
      return await response.json();
    } catch (error) {
      console.error('Error searching nearby places:', error);
      return [];
    }
  }, [isLoaded]);

  return {
    // Include context properties
    ...context,
    
    // Add hook-specific properties
    locationError: geoError,
    geocodeAddress,
    searchNearbyPlaces,
    currentLocation: state.locations.current
  };
} 