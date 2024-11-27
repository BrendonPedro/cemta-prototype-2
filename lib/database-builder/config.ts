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
  SEARCH: {
    INITIAL_RADIUS: 1000,      // Added for initial search radius
    MAX_RADIUS: 2000,         // Maximum radius to search
    RADIUS_INCREMENT: 250,    // How much to increment radius
    MIN_RESULTS: 5,          // Minimum results needed
    MAX_RESULTS: 20,         // Maximum results to return
    NEARBY_THRESHOLD: 1000,   // Distance threshold for "nearby" (meters)
    MAX_DISTANCE: 2000,      // Maximum distance to consider
    BATCH_SIZE: 20,           // How many results to process at once
    PRECISE: {
      RADIUS: 1000,        // Smaller radius for precise location search
      MAX_RESULTS: 20,    // Maximum results to fetch
      BATCH_SIZE: 20,     // Results per API call
      MAX_API_CALLS: 1,   // Maximum API calls
      MERGE_DISTANCE: 100  // Distance to consider as duplicate
    }
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
      LOCATION_PRECISION: 6,  // For locationCaches (Increased precision for for better street-level precision - restaurants nearby)
      METRICS_PRECISION: 5    // For cacheMetrics (Reduced precision for metrics)
    }
  },
  PROCESSING: {
    START_DATE: '2024-01-01',
    TOTAL_LOCATIONS: 500,
    BATCH_SIZE: 20,
    VERIFICATION_INTERVAL: 60000,  
    SAVE_DEBOUNCE: 5000,          
    QUEUE: {
      MAX_ATTEMPTS: 3,
      RETRY_DELAY: 3600000,
      DEFAULT_PRIORITY: 1
    }
}
};