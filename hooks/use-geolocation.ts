// hooks/use-geolocation.ts

import { useState, useEffect } from 'react';

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

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: new GeolocationPositionError(),
        isLoading: false
      }));
      return;
    }

    let watchId: number | null = null;

    const onSuccess = (position: GeolocationPosition) => {
      setState({
        position,
        error: null,
        isLoading: false,
        timestamp: Date.now()
      });
    };

    const onError = (error: GeolocationPositionError) => {
      setState({
        position: null,
        error,
        isLoading: false,
        timestamp: null
      });
    };

    const geolocationOptions: PositionOptions = {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 20000,
      maximumAge: options.maximumAge ?? 0
    };

    if (options.watchPosition) {
      watchId = navigator.geolocation.watchPosition(onSuccess, onError, geolocationOptions);
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, geolocationOptions);
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [options.enableHighAccuracy, options.timeout, options.maximumAge, options.watchPosition]);

  return state;
}
