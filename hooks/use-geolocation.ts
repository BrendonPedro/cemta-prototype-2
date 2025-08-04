'use client';

import { useState, useEffect } from 'react';
import { useMaps } from '@/app/hooks/use-maps';

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

export function useGeolocation(options?: GeolocationOptions) {
  const { getUserLocation, locationError, isLocating, position: contextPosition } = useMaps();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  
  // Update position when the context position changes
  useEffect(() => {
    if (contextPosition) {
      setPosition(contextPosition);
    }
  }, [contextPosition]);
  
  const getCurrentPosition = async () => {
    try {
      // This will update the location in the context
      getUserLocation();
      // The position will be updated via the useEffect above
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };
  
  return {
    getCurrentPosition,
    position,
    error: locationError,
    isLoading: isLocating
  };
} 