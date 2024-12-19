'use client';

import { createContext, useContext, useCallback, useState } from 'react';
import { useJsApiLoader, UseLoadScriptOptions } from '@react-google-maps/api';
import { googleMapsConfig, DEFAULT_CENTER, validateTaiwanCoordinates } from '@/config/googleMapsConfig';
import { useGeolocation } from '@/hooks/use-geolocation';
import { LatLngLiteral } from '@googlemaps/google-maps-services-js';


interface MapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
  userLocation: google.maps.LatLngLiteral | null;
  setUserLocation: (location: google.maps.LatLngLiteral | null) => void;
  locationEnabled: boolean;
  currentLocation: google.maps.LatLngLiteral;
  setCurrentLocation: (location: google.maps.LatLngLiteral) => void;
  center: google.maps.LatLngLiteral;
  setCenter: (location: google.maps.LatLngLiteral) => void;
  pinLocation: google.maps.LatLngLiteral | null;
  setPinLocation: (location: google.maps.LatLngLiteral | null) => void;
  setLocationEnabled: (enabled: boolean) => void;
  toggleLocation: (enabled: boolean) => void;
}

const MapsContext = createContext<MapsContextType | null>(null);

export function MapsProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, loadError } = useJsApiLoader(googleMapsConfig);
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_CENTER);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [pinLocation, setPinLocation] = useState<LatLngLiteral | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLngLiteral | null>(null);
  const { position } = useGeolocation();

  const toggleLocation = useCallback((enabled: boolean) => {
    try {
      setLocationEnabled(enabled);
      if (enabled && position?.coords) {
        const { latitude, longitude } = position.coords;
        if (validateTaiwanCoordinates(latitude, longitude)) {
          const newLocation = { lat: latitude, lng: longitude };
          setUserLocation(newLocation);
          setCurrentLocation(newLocation);
          setCenter(newLocation);
          setPinLocation(newLocation);
        } else {
          console.warn('Location outside Taiwan bounds, using default center');
          setUserLocation(null);
          setCurrentLocation(DEFAULT_CENTER);
          setCenter(DEFAULT_CENTER);
          setPinLocation(null);
        }
      } else {
        setUserLocation(null);
        setCurrentLocation(DEFAULT_CENTER);
        setCenter(DEFAULT_CENTER);
        setPinLocation(null);
      }
    } catch (error) {
      console.error('Error toggling location:', error);
      setUserLocation(null);
      setCurrentLocation(DEFAULT_CENTER);
      setCenter(DEFAULT_CENTER);
      setPinLocation(null);
      setLocationEnabled(false);
    }
  }, [position]);

  return (
    <MapsContext.Provider value={{
      isLoaded,
      loadError,
      userLocation,
      setUserLocation,
      locationEnabled,
      currentLocation,
      setCurrentLocation,
      center,
      setCenter,
      pinLocation,
      setPinLocation,
      setLocationEnabled,
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