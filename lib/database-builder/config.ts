// lib/database-builder/config.ts

export const CONFIG = {
  API: {
    GOOGLE_BATCH_SIZE: 20,
    YELP_BATCH_SIZE: 10,
    DELAY_BETWEEN_CALLS: 1000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000
  },
  PATHS: {
    IMAGES: 'counties/{countyName}/towns/{townName}/restaurants/{restaurantId}/images',
    ORIGINAL_MENUS: 'counties/{countyName}/towns/{townName}/restaurants/{restaurantId}/menus/original',
    PROCESSED_MENUS: 'counties/{countyName}/towns/{townName}/restaurants/{restaurantId}/menus/processed'
  },
  FIRESTORE: {
    COLLECTIONS: {
      COUNTIES: 'counties',
      TOWNS: 'towns',
      RESTAURANTS: 'restaurants',
      MENUS: 'menus',
      LOCATION_CACHE: 'locationCaches',
      METRICS_CACHE: 'cacheMetrics'
    }
  },
  CACHE: {
    DURATION: 365 * 24 * 60 * 60 * 1000, // 365 days
    GEOHASH: {
      LOCATION_PRECISION: 5,  // For locationCaches (broader area grouping)
      METRICS_PRECISION: 6    // For cacheMetrics (exact location tracking)
    }
  },
  PROCESSING: {
    START_DATE: '2024-01-01',
    TOTAL_LOCATIONS: 500,
    BATCH_SIZE: 50
  }
};