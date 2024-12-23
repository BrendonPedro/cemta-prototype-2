'use client';

import { createContext, useContext, useCallback, useReducer } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { googleMapsConfig, DEFAULT_CENTER, validateTaiwanCoordinates } from '@/config/googleMapsConfig';
import { useGeolocation } from '@/hooks/use-geolocation';
import { LatLngLiteral } from '@googlemaps/google-maps-services-js';

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
    case 'SET_USER_LOCATION':
      return {
        ...state,
        locations: { ...state.locations, user: action.payload }
      };
    case 'SET_CURRENT_LOCATION':
      return {
        ...state,
        locations: { ...state.locations, current: action.payload }
      };
    case 'SET_PIN':
      return {
        ...state,
        locations: { ...state.locations, pin: action.payload }
      };
    case 'SET_CENTER':
      return {
        ...state,
        locations: { ...state.locations, center: action.payload }
      };
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
  setUserLocation: (location: LatLngLiteral | null) => void;
  setCurrentLocation: (location: LatLngLiteral) => void;
  setCenter: (location: LatLngLiteral) => void;
  setPinLocation: (location: LatLngLiteral | null) => void;
  setLocationEnabled: (enabled: boolean) => void;
  toggleLocation: (enabled: boolean) => void;
}

const MapsContext = createContext<MapsContextType | null>(null);

export function MapsProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, loadError } = useJsApiLoader(googleMapsConfig);
  const { position } = useGeolocation();
  const [state, dispatch] = useReducer(mapReducer, initialState);

  const setUserLocation = useCallback((location: LatLngLiteral | null) => {
    dispatch({ type: 'SET_USER_LOCATION', payload: location });
  }, []);

  const setCurrentLocation = useCallback((location: LatLngLiteral) => {
    dispatch({ type: 'SET_CURRENT_LOCATION', payload: location });
  }, []);

  const setCenter = useCallback((location: LatLngLiteral) => {
    dispatch({ type: 'SET_CENTER', payload: location });
  }, []);

  const setPinLocation = useCallback((location: LatLngLiteral | null) => {
    dispatch({ type: 'SET_PIN', payload: location });
  }, []);
  const setLocationEnabled = useCallback((enabled: boolean) => {
    dispatch({ type: 'TOGGLE_LOCATION', payload: enabled });
  }, []);

  const toggleLocation = useCallback((enabled: boolean) => {
    try {
      dispatch({ type: 'TOGGLE_LOCATION', payload: enabled });
      
      if (enabled && position?.coords) {
        const { latitude, longitude } = position.coords;
        if (validateTaiwanCoordinates(latitude, longitude)) {
          const newLocation = { lat: latitude, lng: longitude };
          dispatch({ type: 'SET_USER_LOCATION', payload: newLocation });
          dispatch({ type: 'SET_CURRENT_LOCATION', payload: newLocation });
          dispatch({ type: 'SET_CENTER', payload: newLocation });
          dispatch({ type: 'SET_PIN', payload: newLocation });
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
  }, [position]);

  return (
    <MapsContext.Provider value={{
      isLoaded,
      loadError,
      state,
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

export const useMaps = () => {
  const context = useContext(MapsContext);
  if (!context) {
    throw new Error('useMaps must be used within a MapsProvider');
  }
  return context;
};