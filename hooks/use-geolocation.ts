import { useState, useEffect } from 'react';

// Define the GeolocationError type
type GeolocationErrorType = {
  code: number;
  message: string;
  PERMISSION_DENIED: number;
  POSITION_UNAVAILABLE: number;
  TIMEOUT: number;
};

interface GeolocationState {
  position: GeolocationPosition | null;
  error: GeolocationPositionError | null; // Using the correct type
  isLoading: boolean;
}

export function useGeolocation(options: PositionOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: true
  });

  useEffect(() => {
    // Try to get cached position first
    const cachedPosition = sessionStorage.getItem('lastKnownPosition');
    if (cachedPosition) {
      const position = JSON.parse(cachedPosition);
      setState({
        position,
        error: null,
        isLoading: false
      });
    }

    const successHandler = (position: GeolocationPosition) => {
      // Cache the position
      sessionStorage.setItem('lastKnownPosition', JSON.stringify(position));
      setState({
        position,
        error: null,
        isLoading: false
      });
    };

    const errorHandler = (error: GeolocationPositionError) => {
      setState({
        position: null,
        error,
        isLoading: false
      });
    };

    // Default options for better performance
    const defaultOptions: PositionOptions = {
      enableHighAccuracy: false, // Faster initial position
      timeout: 5000,            // Fail fast if no position
      maximumAge: 300000,       // Cache position for 5 minutes
      ...options
    };

    setState(prev => ({ ...prev, isLoading: true }));

    // Check if geolocation is available
    if (!navigator.geolocation) {
      setState({
        position: null,
        error: {
          code: 2,
          message: 'Geolocation is not supported by this browser.',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3
        } as GeolocationPositionError,
        isLoading: false
      });
      return;
    }

    // Watch position
    const watchId = navigator.geolocation.watchPosition(
      successHandler,
      errorHandler,
      defaultOptions
    );

    // Cleanup
    return () => navigator.geolocation.clearWatch(watchId);
  }, []); // Empty deps array means this only runs once

  return state;
}

// Example usage:
/*
const YourComponent = () => {
  const { position, error, isLoading } = useGeolocation();

  if (isLoading) {
    return <div>Loading location...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (position) {
    return (
      <div>
        Latitude: {position.coords.latitude}
        Longitude: {position.coords.longitude}
      </div>
    );
  }

  return null;
};
*/