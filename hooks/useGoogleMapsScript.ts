// hooks/useGoogleMapsScript.ts
'use client';

import { useState, useEffect } from 'react';

interface UseGoogleMapsScriptResult {
  isLoaded: boolean;
  loadError: Error | null;
}

export function useGoogleMapsScript(): UseGoogleMapsScriptResult {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    if (window.google) {
      setIsLoaded(true);
      return;
    }

    async function loadGoogleMaps() {
      try {
        const response = await fetch('/api/maps');
        const { apiKey } = await response.json();

        if (!apiKey) {
          throw new Error('No API key available');
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          setIsLoaded(true);
        };

        script.onerror = () => {
          setLoadError(new Error('Failed to load Google Maps script'));
        };

        document.head.appendChild(script);
      } catch (error) {
        setLoadError(error instanceof Error ? error : new Error('Failed to load Google Maps'));
      }
    }

    loadGoogleMaps();
  }, []);

  return { isLoaded, loadError };
}