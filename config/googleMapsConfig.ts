// Shared configuration for Google Maps

import { Libraries } from '@react-google-maps/api';

// Server-side configuration
export const serverConfig = {
  apiKey: process.env.GOOGLE_MAPS_API_KEY,
  libraries: ['places'],
  version: 'weekly',
  retryOptions: {
    maxRetries: 3,
    maxRetryDelay: 2000
  }
};

// Client-side configuration
export const clientConfig = {
  id: "google-map-script",
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  libraries: ['places', 'geometry', 'drawing', 'marker'] as Libraries,
  version: 'weekly',
  mapIds: [process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID!]
};