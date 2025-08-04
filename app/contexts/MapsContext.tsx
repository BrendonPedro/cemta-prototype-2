'use client';

import { createContext, useContext, useCallback, useReducer, useEffect, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { googleMapsConfig, DEFAULT_CENTER, validateTaiwanCoordinates } from '@/config/googleMapsConfig';
import { LatLngLiteral } from '@googlemaps/google-maps-services-js';
import { cacheService } from "@/app/services/maps/cacheService";
import { getLocationCacheKey } from '@/app/services/maps/cacheService';
import { CONFIG } from '@/lib/database-builder/config';

interface MapState {
  locations: {
    current: LatLngLiteral;
    user: LatLngLiteral | null;
    pin: LatLngLiteral | null;
    center: LatLngLiteral;
  };
  settings: {
    enabled: boolean;
  };
}

type MapAction =
  | { type: 'SET_USER_LOCATION'; payload: LatLngLiteral | null }
  | { type: 'SET_CURRENT_LOCATION'; payload: LatLngLiteral }
  | { type: 'SET_PIN'; payload: LatLngLiteral | null }
  | { type: 'SET_CENTER'; payload: LatLngLiteral }
  | { type: 'RESET_TO_DEFAULT' }
  | { type: 'TOGGLE_LOCATION'; payload: boolean };

const validateLocation = (location: LatLngLiteral | null): LatLngLiteral => {
  if (!location || !isFinite(location.lat) || !isFinite(location.lng)) {
    console.warn('Invalid location, using default center:', location);
    return DEFAULT_CENTER;
  }
  
  if (!validateTaiwanCoordinates(location.lat, location.lng)) {
    console.warn('Location outside Taiwan bounds, using default center');
    return DEFAULT_CENTER;
  }
  
  return location;
};

const initialState: MapState = {
  locations: {
    current: DEFAULT_CENTER,
    user: null,
    pin: null,
    center: DEFAULT_CENTER
  },
  settings: {
    enabled: false
  }
};

function mapReducer(state: MapState, action: MapAction): MapState {
  switch (action.type) {
    case 'SET_USER_LOCATION': {
      const validatedLocation = action.payload ? validateLocation(action.payload) : null;
      return {
        ...state,
        locations: { ...state.locations, user: validatedLocation }
      };
    }
    case 'SET_CURRENT_LOCATION': {
      const validatedLocation = validateLocation(action.payload);
      return {
        ...state,
        locations: { ...state.locations, current: validatedLocation }
      };
    }
    case 'SET_PIN': {
      const validatedLocation = action.payload ? validateLocation(action.payload) : null;
      return {
        ...state,
        locations: { ...state.locations, pin: validatedLocation }
      };
    }
    case 'SET_CENTER': {
      const validatedLocation = validateLocation(action.payload);
      return {
        ...state,
        locations: { ...state.locations, center: validatedLocation }
      };
    }
    case 'RESET_TO_DEFAULT':
      return {
        ...initialState,
        settings: { ...state.settings }
      };
    case 'TOGGLE_LOCATION':
      return {
        ...state,
        settings: { ...state.settings, enabled: action.payload }
      };
    default:
      return state;
  }
}

interface MapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
  state: MapState;
  position: LatLngLiteral | null;
  geoError: string | null;
  isLocating: boolean;
  getUserLocation: () => void;
  setUserLocation: (location: LatLngLiteral | null) => void;
  setCurrentLocation: (location: LatLngLiteral) => void;
  setCenter: (location: LatLngLiteral) => void;
  setPinLocation: (location: LatLngLiteral | null) => void;
  setLocationEnabled: (enabled: boolean) => void;
  toggleLocation: (enabled: boolean) => Promise<void>;
}

const MapsContext = createContext<MapsContextType | null>(null);

export function MapsProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, loadError } = useJsApiLoader(googleMapsConfig);
  const [state, dispatch] = useReducer(mapReducer, initialState);
  
  // Implement geolocation directly instead of using the hook
  const [position, setPosition] = useState<LatLngLiteral | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Get user's location directly
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (geoPosition) => {
        const { latitude, longitude } = geoPosition.coords;
        setPosition({ lat: latitude, lng: longitude });
        setIsLocating(false);
      },
      (error) => {
        setGeoError(`Error getting location: ${error.message}`);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, []);

  // Validate coordinates helper
  const isValidCoordinate = useCallback((location: LatLngLiteral): boolean => {
    return (
      location &&
      typeof location.lat === 'number' &&
      typeof location.lng === 'number' &&
      isFinite(location.lat) &&
      isFinite(location.lng) &&
      validateTaiwanCoordinates(location.lat, location.lng)
    );
  }, []);

  const setUserLocation = useCallback((location: LatLngLiteral | null) => {
    if (location && !isValidCoordinate(location)) {
      console.warn('Invalid user location:', location);
      return;
    }
    dispatch({ type: 'SET_USER_LOCATION', payload: location });
  }, [isValidCoordinate]);

  const setCurrentLocation = useCallback((location: LatLngLiteral) => {
    if (!isValidCoordinate(location)) {
      console.warn('Invalid current location:', location);
      return;
    }
    dispatch({ type: 'SET_CURRENT_LOCATION', payload: location });
  }, [isValidCoordinate]);

  const setCenter = useCallback((location: LatLngLiteral) => {
    if (!isValidCoordinate(location)) {
      console.warn('Invalid center location:', location);
      return;
    }
    dispatch({ type: 'SET_CENTER', payload: location });
  }, [isValidCoordinate]);

  const setPinLocation = useCallback((location: LatLngLiteral | null) => {
    if (location && !isValidCoordinate(location)) {
      console.warn('Invalid pin location:', location);
      return;
    }
    dispatch({ type: 'SET_PIN', payload: location });
  }, [isValidCoordinate]);

  const setLocationEnabled = useCallback((enabled: boolean) => {
    dispatch({ type: 'TOGGLE_LOCATION', payload: enabled });
  }, []);

  const toggleLocation = useCallback(async (enabled: boolean) => {
    try {
      dispatch({ type: 'TOGGLE_LOCATION', payload: enabled });
      
      if (enabled && position) {
        const { lat: latitude, lng: longitude } = position;
        
        if (validateTaiwanCoordinates(latitude, longitude)) {
          const newLocation = { lat: latitude, lng: longitude };
          const locationKey = getLocationCacheKey(latitude, longitude);
          
          const cachedData = await cacheService.get(locationKey);
          
          if (cachedData) {
            const coordinates = {
              lat: (cachedData as any).latitude || 0,
              lng: (cachedData as any).longitude || 0
            };
  
            if (isValidCoordinate(coordinates)) {
              dispatch({ type: 'SET_USER_LOCATION', payload: coordinates });
              dispatch({ type: 'SET_CURRENT_LOCATION', payload: coordinates });
              dispatch({ type: 'SET_CENTER', payload: coordinates });
              dispatch({ type: 'SET_PIN', payload: coordinates });
            }
          } else {
            await cacheService.set(locationKey, {
              coordinates: newLocation,
              latitude: newLocation.lat,
              longitude: newLocation.lng,
              county: '', // Required by LocationResponse
              townName: '', // Required by LocationResponse
              restaurants: [], // Required by MapCacheEntry
              geohash: locationKey,
            });
            
            dispatch({ type: 'SET_USER_LOCATION', payload: newLocation });
            dispatch({ type: 'SET_CURRENT_LOCATION', payload: newLocation });
            dispatch({ type: 'SET_CENTER', payload: newLocation });
            dispatch({ type: 'SET_PIN', payload: newLocation });
          }
        } else {
          console.warn('Location outside Taiwan bounds, using default center');
          dispatch({ type: 'RESET_TO_DEFAULT' });
        }
      } else {
        dispatch({ type: 'RESET_TO_DEFAULT' });
      }
    } catch (error) {
      console.error('Error toggling location:', error);
      dispatch({ type: 'RESET_TO_DEFAULT' });
    }
  }, [position, isValidCoordinate]);

  // Add effect to validate position changes
  useEffect(() => {
    if (position) {
      const { lat: latitude, lng: longitude } = position;
      if (state.settings.enabled && isValidCoordinate({ lat: latitude, lng: longitude })) {
        setUserLocation({ lat: latitude, lng: longitude });
      }
    }
  }, [position, state.settings.enabled, isValidCoordinate, setUserLocation]);

  return (
    <MapsContext.Provider value={{
      isLoaded,
      loadError,
      state,
      position,
      geoError,
      isLocating,
      getUserLocation,
      setUserLocation,
      setCurrentLocation,
      setCenter,
      setPinLocation,
      setLocationEnabled,
      toggleLocation
    }}>
      {children}
    </MapsContext.Provider>
  );
}

export const useMapsContext = () => {
  const context = useContext(MapsContext);
  if (!context) {
    throw new Error('useMaps must be used within a MapsProvider');
  }
  return context;
};