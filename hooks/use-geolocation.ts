// hooks/use-geolocation.ts

import { useState, useEffect, useRef } from 'react';

interface GeolocationState {
  position: GeolocationPosition | null;
  error: GeolocationPositionError | null;
  isLoading: boolean;
  timestamp: number | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: true,
    timestamp: null
  });
  
  const hasPosition = useRef(false);
  const lastValidPosition = useRef<GeolocationPosition | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: new GeolocationPositionError(),
        isLoading: false
      }));
      return;
    }

    const validateTaiwanCoordinates = (lat: number, lng: number): boolean => {
      return !(lat < 21.9 || lat > 25.3 || lng < 120.0 || lng > 122.0);
    };

    const onSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      
      if (validateTaiwanCoordinates(latitude, longitude)) {
        hasPosition.current = true;
        lastValidPosition.current = position;
        setState({
          position,
          error: null,
          isLoading: false,
          timestamp: Date.now()
        });
      } else {
        // If coordinates are outside Taiwan, return last valid position or error
        setState(prev => ({
          position: lastValidPosition.current,
          error: new GeolocationPositionError(),
          isLoading: false,
          timestamp: prev.timestamp
        }));
      }
    };

    const onError = (error: GeolocationPositionError) => {
      setState(prev => ({
        position: lastValidPosition.current,
        error,
        isLoading: false,
        timestamp: prev.timestamp
      }));
    };

    const geolocationOptions: PositionOptions = {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 20000,
      maximumAge: options.maximumAge ?? 0
    };

    if (options.watchPosition) {
      const watchId = navigator.geolocation.watchPosition(
        onSuccess, 
        onError, 
        geolocationOptions
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else if (!hasPosition.current) {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, geolocationOptions);
    }
  }, [
    options.enableHighAccuracy,
    options.timeout,
    options.maximumAge,
    options.watchPosition
  ]);

  return state;
}