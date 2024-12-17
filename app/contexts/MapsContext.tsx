'use client';

import { createContext, useContext, useCallback, useState } from 'react';
import { useJsApiLoader, UseLoadScriptOptions } from '@react-google-maps/api';
import { googleMapsConfig, DEFAULT_CENTER, validateTaiwanCoordinates } from '@/config/googleMapsConfig';
import { useGeolocation } from '@/hooks/use-geolocation';


interface MapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
  userLocation: google.maps.LatLngLiteral | null;
  locationEnabled: boolean;
  currentLocation: google.maps.LatLngLiteral;
  setCurrentLocation: (location: google.maps.LatLngLiteral) => void;
  toggleLocation: (enabled: boolean) => void;
}

const MapsContext = createContext<MapsContextType | null>(null);

export function MapsProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, loadError } = useJsApiLoader(googleMapsConfig);
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_CENTER);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const { position } = useGeolocation();
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);


  const toggleLocation = useCallback((enabled: boolean) => {
    try {
      setLocationEnabled(enabled);
      if (enabled && position?.coords) {
        const { latitude, longitude } = position.coords;
        if (validateTaiwanCoordinates(latitude, longitude)) {
          const newLocation = { lat: latitude, lng: longitude };
          setUserLocation(newLocation);
          setCurrentLocation(newLocation);
        } else {
          console.warn('Location outside Taiwan bounds, using default center');
          setUserLocation(null);
          setCurrentLocation(DEFAULT_CENTER);
        }
      } else {
        setUserLocation(null);
        setCurrentLocation(DEFAULT_CENTER);
      }
    } catch (error) {
      console.error('Error toggling location:', error);
      // Fallback to default center
      setUserLocation(null);
      setCurrentLocation(DEFAULT_CENTER);
      setLocationEnabled(false);
    }
  }, [position]);

  return (
    <MapsContext.Provider value={{
      isLoaded,
      loadError,
      userLocation,
      locationEnabled,
      currentLocation,
      setCurrentLocation,
      toggleLocation
    }}>
      {children}
    </MapsContext.Provider>
  );
}

export const useMaps = () => {
  const context = useContext(MapsContext);
  if (!context) {
    throw new Error('useMaps must be used within a MapsProvider');
  }
  return context;
};