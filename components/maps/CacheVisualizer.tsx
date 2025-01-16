'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Polygon } from '@react-google-maps/api';
import geohash from 'ngeohash';
import { CONFIG } from '@/lib/database-builder/config';
import { mapCache } from "@/app/services/cache/mapCacheService";  // Updated path
import { LatLngLiteral } from '@googlemaps/google-maps-services-js';  // Use Google's type instead

interface CacheVisualizerProps {
  map: google.maps.Map | null;
  currentLocation: LatLngLiteral;
}

interface CacheRegion {
  geohash: string;
  bounds: {
    sw: LatLngLiteral;
    ne: LatLngLiteral;
  };
  hasData: boolean;
  isCurrent: boolean;
}

export const CacheVisualizer: React.FC<CacheVisualizerProps> = ({ map, currentLocation }) => {
  const [cacheRegions, setCacheRegions] = useState<CacheRegion[]>([]);

  const checkCacheStatus = useCallback(async (hash: string): Promise<boolean> => {
    const cached = await mapCache.get(hash);
    return cached !== null;
  }, []);

  useEffect(() => {
    if (!map || !currentLocation) return;

    const updateCacheRegions = async () => {
      const currentGeohash = geohash.encode(
        currentLocation.lat, 
        currentLocation.lng, 
        CONFIG.CACHE.GEOHASH.LOCATION_PRECISION
      );
      
      const neighbors = geohash.neighbors(currentGeohash);
      const allGeohashes = [currentGeohash, ...neighbors];
      
      const regions = await Promise.all(allGeohashes.map(async (hash) => {
        const bounds = geohash.decode_bbox(hash);
        const hasData = await checkCacheStatus(hash);
        
        return {
          geohash: hash,
          bounds: {
            sw: { lat: bounds[0], lng: bounds[1] },
            ne: { lat: bounds[2], lng: bounds[3] }
          },
          hasData,
          isCurrent: hash === currentGeohash
        };
      }));

      setCacheRegions(regions);
    };

    updateCacheRegions();

    // Update regions periodically
    const interval = setInterval(updateCacheRegions, CONFIG.PROCESSING.VERIFICATION_INTERVAL);
    return () => clearInterval(interval);
  }, [map, currentLocation, checkCacheStatus]);

  return (
    <>
      {cacheRegions.map((region) => {
        const coordinates = [
          { lat: region.bounds.sw.lat, lng: region.bounds.sw.lng },
          { lat: region.bounds.sw.lat, lng: region.bounds.ne.lng },
          { lat: region.bounds.ne.lat, lng: region.bounds.ne.lng },
          { lat: region.bounds.ne.lat, lng: region.bounds.sw.lng }
        ];

        return (
          <Polygon
            key={region.geohash}
            paths={coordinates}
            options={{
              fillColor: region.hasData ? '#4A90E2' : '#FFB74D',
              fillOpacity: region.isCurrent ? 0.3 : 0.2,
              strokeColor: region.isCurrent ? '#2171CC' : '#5BA4D4',
              strokeOpacity: 0.8,
              strokeWeight: region.isCurrent ? 2 : 1,
              clickable: false
            }}
          />
        );
      })}
    </>
  );
};

export default CacheVisualizer;