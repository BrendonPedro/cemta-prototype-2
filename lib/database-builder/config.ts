// lib/database-builder/config.ts

export const CONFIG = {
  API: {
    GOOGLE_BATCH_SIZE: 20,
    YELP_BATCH_SIZE: 10,
    DELAY_BETWEEN_CALLS: 1000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    DAILY_LIMIT: 200, // Daily API call limit
  },
  SEARCH: {  // shared search config
    INITIAL_RADIUS: 25,
    MAX_RADIUS: 500,
    RADIUS_INCREMENT: 25,
    MIN_RESULTS: 5,
    MAX_RESULTS: 30
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
      METRICS_CACHE: 'cacheMetrics',
      // Add new queue-related collections
      PROCESSING_QUEUE: 'processingQueue',
      API_USAGE: 'apiQuotaUsage',
      PROCESSING_METRICS: 'processingMetrics'
    }
  },
  CACHE: {
    DURATION: 365 * 24 * 60 * 60 * 1000, // 365 days
    GEOHASH: {
      LOCATION_PRECISION: 7,  // For locationCaches (Increased precision for finer location caching - restaurants nearby)
      METRICS_PRECISION: 6    // For cacheMetrics (exact location tracking)
    }
  },
  PROCESSING: {
    START_DATE: '2024-01-01',
    TOTAL_LOCATIONS: 500,
    BATCH_SIZE: 50,
    // Add queue-specific settings
    QUEUE: {
      MAX_ATTEMPTS: 3,       // Maximum retry attempts for failed towns
      RETRY_DELAY: 3600000,  // 1 hour delay before retrying failed towns
      DEFAULT_PRIORITY: 1    // Default priority for towns in queue
    }
  }
};