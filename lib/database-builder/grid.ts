// app/lib/database-builder/grid.ts

import geohash from 'ngeohash';
import type { Location } from './types';

export function generateGridPoints(
  center: Location,
  radiusKm: number,
  gridSizeKm = 1
): Location[] {
  const points: Location[] = [];
  const latKm = 111.32; // Approximate km per degree latitude
  const lngKm = 111.32 * Math.cos(center.lat * Math.PI / 180);
  
  const latOffset = radiusKm / latKm;
  const lngOffset = radiusKm / lngKm;
  const gridLatSize = gridSizeKm / latKm;
  const gridLngSize = gridSizeKm / lngKm;
  
  for (let lat = center.lat - latOffset; lat <= center.lat + latOffset; lat += gridLatSize) {
    for (let lng = center.lng - lngOffset; lng <= center.lng + lngOffset; lng += gridLngSize) {
      points.push({ lat, lng });
    }
  }
  
  return points;
}

export function getGeohashKey(location: Location): string {
  return geohash.encode(location.lat, location.lng, 6);
}