// Unified Maps hook
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { googleMapsConfig } from '@/config/googleMapsConfig';
import { useMapsContext } from '@/app/contexts/MapsContext';
import type { LatLngLiteral } from '@googlemaps/google-maps-services-js';

interface UseMapsOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

export function useMaps(options: UseMapsOptions = {}) {
  // Get context values first
  const context = useMapsContext();
  
  // Use context's isLoaded and loadError instead of creating new ones
  const { isLoaded, loadError } = context;
  
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Get user's location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lng: longitude };
        
        // Update context
        context.setUserLocation(location);
        context.setCurrentLocation(location);
        context.setPinLocation(location);
        
        setIsLocating(false);
      },
      (error) => {
        setLocationError(`Error getting location: ${error.message}`);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 10000,
        maximumAge: options.maximumAge ?? 60000
      }
    );
  }, [context, options.enableHighAccuracy, options.timeout, options.maximumAge]);

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

  // Initialize location on mount if requested
  useEffect(() => {
    if (options.watchPosition) {
      getUserLocation();
    }
  }, [getUserLocation, options.watchPosition]);

  return {
    // Include context properties
    ...context,
    
    // Add hook-specific properties
    locationError,
    isLocating,
    getUserLocation,
    geocodeAddress,
    searchNearbyPlaces
  };
} 