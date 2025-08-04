/**
 * Calculates the distance between two coordinates in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

/**
 * Converts meters to kilometers
 */
export function metersToKilometers(meters: number): number {
  return meters / 1000;
}

/**
 * Converts kilometers to meters
 */
export function kilometersToMeters(km: number): number {
  return km * 1000;
}

/**
 * Formats a distance in a human-readable way
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else {
    return `${(meters / 1000).toFixed(1)}km`;
  }
}

/**
 * Checks if a location is within a certain radius of another location
 */
export function isWithinRadius(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number, 
  radiusInMeters: number
): boolean {
  const distance = calculateDistance(lat1, lng1, lat2, lng2);
  return distance <= radiusInMeters;
} 