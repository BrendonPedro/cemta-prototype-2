import { Libraries } from '@react-google-maps/api';

// Define shared libraries
export const GOOGLE_MAPS_LIBRARIES: Libraries = ['places', 'geometry', 'drawing', 'marker'];

// Single shared configuration for both client and server
export const googleMapsConfig = {
  id: 'google-map-script',
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  version: 'weekly',
  libraries: GOOGLE_MAPS_LIBRARIES,
  mapIds: [process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID!],
  region: 'TW',
};

// Map display options
export const mapOptions = {
  mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID,
  disableDefaultUI: true,
  clickableIcons: false,
  minZoom: 8,
  maxZoom: 20,
  mapTypeControl: false,
  fullscreenControl: false,
  zoomControl: true,
  streetViewControl: false,
  tilt: 0,
  heading: 0,
  gestureHandling: 'greedy' as const,
  draggableCursor: 'pointer',
  draggingCursor: 'grabbing'
};

// Constants and utility functions
export const DEFAULT_CENTER = { lat: 25.0330, lng: 121.5654 }; // Taipei
export const DEFAULT_ZOOM = 14;

export const validateTaiwanCoordinates = (lat: number, lng: number): boolean => {
  return !(lat < 21.9 || lat > 25.3 || lng < 120.0 || lng > 122.0);
};