// hooks/use-geolocation.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { validateTaiwanCoordinates } from '@/config/googleMapsConfig';
import { CONFIG } from '@/lib/database-builder/config';

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
  
  const positionRef = useRef<GeolocationPosition | null>(null);
  const watchIdRef = useRef<number>();

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords;
    
    if (validateTaiwanCoordinates(latitude, longitude)) {
      positionRef.current = position;
      setState({
        position,
        error: null,
        isLoading: false,
        timestamp: Date.now()
      });
    } else {
      setState(prev => ({
        position: positionRef.current,
        error: new GeolocationPositionError(),
        isLoading: false,
        timestamp: prev.timestamp
      }));
    }
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    setState(prev => ({
      position: positionRef.current,
      error,
      isLoading: false,
      timestamp: prev.timestamp
    }));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: new GeolocationPositionError(),
        isLoading: false
      }));
      return;
    }

    const geolocationOptions: PositionOptions = {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? CONFIG.API.DELAY_BETWEEN_CALLS,
      maximumAge: options.maximumAge ?? CONFIG.CACHE.STRATEGY.MEMORY.TTL
    };

    if (options.watchPosition) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess, 
        handleError, 
        geolocationOptions
      );

      return () => {
        if (watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      };
    } 

    navigator.geolocation.getCurrentPosition(
      handleSuccess, 
      handleError, 
      geolocationOptions
    );
  }, [
    options.enableHighAccuracy,
    options.timeout,
    options.maximumAge,
    options.watchPosition,
    handleSuccess,
    handleError
  ]);

  return state;
}