'use client';

import { useCallback, useState, useRef, useEffect } from "react";
import { Restaurant } from "@/interfaces/restaurant/types";
import { validateTaiwanCoordinates } from '@/config/googleMapsConfig';
import { CONFIG } from '@/lib/database-builder/config';
import { getCachedRestaurantDetails } from '@/app/services/firebaseFirestore';

export function useRestaurantHandler(firebaseToken: string) {
  const [focusedRestaurant, setFocusedRestaurant] = useState<Restaurant | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const restaurantCache = useRef<Map<string, { data: Restaurant; timestamp: number }>>(new Map());

  // Add cache cleanup effect
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      for (const [id, entry] of restaurantCache.current.entries()) {
        if (now - entry.timestamp > CONFIG.CACHE.DURATION) {
          restaurantCache.current.delete(id);
        }
      }
    };

    const interval = setInterval(cleanup, CONFIG.PROCESSING.VERIFICATION_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Add validation helper
  const validatePosition = useCallback((lat: number, lng: number): boolean => {
    if (!validateTaiwanCoordinates(lat, lng)) {
      console.warn('Location outside Taiwan bounds:', { lat, lng });
      return false;
    }
    return true;
  }, []);

  const handleRestaurantSelection = useCallback(async (
    restaurant: Restaurant,
    position: { lat: number; lng: number }
  ) => {
    // Validate position before proceeding
    if (!validatePosition(position.lat, position.lng)) {
      console.warn('Skipping selection - invalid position');
      return;
    }

    setSelectedMarker(restaurant.id);
    
    if (mapRef.current) {
      mapRef.current.panTo(position);
      mapRef.current.setZoom(16);
    }

    try {
      // Check memory cache first
      const cachedEntry = restaurantCache.current.get(restaurant.id);
      if (cachedEntry && (Date.now() - cachedEntry.timestamp < CONFIG.CACHE.DURATION)) {
        console.log('Using memory-cached restaurant details');
        setFocusedRestaurant(cachedEntry.data);
        return;
      }

      // Check Firestore cache
      const cachedDetails = await getCachedRestaurantDetails(restaurant.id);
      if (cachedDetails) {
        console.log('Using Firestore-cached restaurant details');
        const updatedRestaurant = {
          ...cachedDetails,
          hasDetailsFetched: true
        };
        // Update memory cache
        restaurantCache.current.set(restaurant.id, {
          data: updatedRestaurant,
          timestamp: Date.now()
        });
        setFocusedRestaurant(updatedRestaurant);
        return;
      }

      // Only fetch if we don't have cached details
      if (!restaurant.hasDetailsFetched) {
        console.log(`💰 [COST] Fetching details for restaurant: ${restaurant.name}`);
        const response = await fetch(
          `/api/restaurants?lat=${position.lat}&lng=${position.lng}&id=${restaurant.id}&type=details`,
          {
            headers: {
              Authorization: `Bearer ${firebaseToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch additional restaurant details');
        }

        const data = await response.json();
        if (data.restaurant) {
          const updatedRestaurant = {
            ...data.restaurant,
            hasDetailsFetched: true
          };
          // Update memory cache
          restaurantCache.current.set(restaurant.id, {
            data: updatedRestaurant,
            timestamp: Date.now()
          });
          setFocusedRestaurant(updatedRestaurant);
        } else {
          setFocusedRestaurant(restaurant);
        }
      } else {
        setFocusedRestaurant(restaurant);
      }
    } catch (error) {
      console.error('Error handling restaurant selection:', error);
      setFocusedRestaurant(restaurant);
    }
  }, [firebaseToken, validatePosition]);

  const handleTableClick = useCallback((restaurant: Restaurant) => {
    const position = { 
      lat: restaurant.latitude, 
      lng: restaurant.longitude 
    };
    handleRestaurantSelection(restaurant, position);
  }, [handleRestaurantSelection]);

  const handleMarkerClick = useCallback((
    restaurant: Restaurant,
    position: { lat: number; lng: number }
  ) => {
    handleRestaurantSelection(restaurant, position);
  }, [handleRestaurantSelection]);

  const resetFocus = useCallback(() => {
    setFocusedRestaurant(null);
    setSelectedMarker(null);
  }, []);

  return {
    focusedRestaurant,
    selectedMarker,
    handleTableClick,
    handleMarkerClick,
    resetFocus,
    mapRef
  };
}