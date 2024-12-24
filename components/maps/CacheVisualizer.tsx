'use client';

import React, { useEffect, useState } from 'react';
import { Polygon } from '@react-google-maps/api';
import geohash from 'ngeohash';

interface CacheVisualizerProps {
  map: google.maps.Map | null;
  currentLocation: { lat: number; lng: number };
}

interface GeohashBounds {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

interface CacheRegion {
  geohash: string;
  bounds: GeohashBounds;
  timestamp: number;
  isCurrent: boolean;
}

export const CacheVisualizer: React.FC<CacheVisualizerProps> = ({ map, currentLocation }) => {
  const [cacheRegions, setCacheRegions] = useState<CacheRegion[]>([]);

  useEffect(() => {
    if (!map || !currentLocation) return;

    // Get the current geohash
    const currentGeohash = geohash.encode(currentLocation.lat, currentLocation.lng, 6);
    
    // Get neighbors
    const neighbors = geohash.neighbors(currentGeohash);
    
    // Combine current and neighbors
    const allGeohashes = [currentGeohash, ...neighbors];
    
    // Convert geohashes to bounds
    const regions = allGeohashes.map(hash => {
      const bounds = geohash.decode_bbox(hash);
      return {
        geohash: hash,
        bounds: {
          sw: { lat: bounds[0], lng: bounds[1] },
          ne: { lat: bounds[2], lng: bounds[3] }
        },
        timestamp: Date.now(),
        isCurrent: hash === currentGeohash
      };
    });

    setCacheRegions(regions);
  }, [map, currentLocation]);

  return (
    <>
      {cacheRegions.map((region) => {
        // Create polygon coordinates
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
              fillColor: region.isCurrent ? '#4A90E2' : '#82C8E6',
              fillOpacity: 0.2,
              strokeColor: region.isCurrent ? '#2171CC' : '#5BA4D4',
              strokeOpacity: 0.8,
              strokeWeight: 2
            }}
          />
        );
      })}
    </>
  );
};

export default CacheVisualizer;