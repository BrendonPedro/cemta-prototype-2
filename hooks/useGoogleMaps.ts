// hooks/useGoogleMaps.ts
'use client';

import { useState, useEffect } from 'react';

interface GoogleMapsState {
  isLoaded: boolean;
  loadError: string | null;
  maps: typeof google.maps | null;
}

export function useGoogleMaps() {
  const [state, setState] = useState<GoogleMapsState>({
    isLoaded: false,
    loadError: null,
    maps: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function initializeGoogleMaps() {
      try {
        // Fetch API key
        const response = await fetch("/api/maps");
        const data = await response.json();
        
        if (!data.apiKey) throw new Error("No API key available");

        // Load Google Maps script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          if (isMounted) {
            setState({
              isLoaded: true,
              loadError: null,
              maps: window.google.maps,
            });
          }
        };

        script.onerror = () => {
          if (isMounted) {
            setState(prev => ({
              ...prev,
              loadError: "Failed to load Google Maps",
            }));
          }
        };

        document.head.appendChild(script);
      } catch (error) {
        if (isMounted) {
          setState(prev => ({
            ...prev,
            loadError: "Failed to initialize Google Maps",
          }));
        }
      }
    }

    initializeGoogleMaps();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}