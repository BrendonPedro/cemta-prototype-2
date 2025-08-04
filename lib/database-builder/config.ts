// lib/database-builder/config.ts

// First declare collection names separately to avoid circular reference
const COLLECTION_NAMES = {
  COUNTIES: 'counties',
  TOWNS: 'towns',
  RESTAURANTS: 'restaurants',
  MENUS: 'menus',
  LOCATION_CACHE: 'locationCaches',
  METRICS_CACHE: 'cacheMetrics',
  PROCESSING_QUEUE: 'processingQueue',
  API_USAGE: 'apiQuotaUsage',
  PROCESSING_METRICS: 'processingMetrics',
  MAP_STATES: 'mapStates'
} as const;

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
    INITIAL_RADIUS: 1000,      // Initial search radius
    MAX_RADIUS: 2000,          // Maximum radius to search
    RADIUS_INCREMENT: 250,     // How much to increment radius
    MIN_RESULTS: 5,            // Minimum results needed
    MAX_RESULTS: 20,           // Maximum results to return
    NEARBY_THRESHOLD: 1000,    // Distance threshold for "nearby" (meters)
    MAX_DISTANCE: 2000,        // Maximum distance to consider
    BATCH_SIZE: 20,            // How many results to process at once
    PRECISE: {
      RADIUS: 1000,            // Smaller radius for precise location search
      MAX_RESULTS: 20,         // Maximum results to fetch
      BATCH_SIZE: 20,          // Results per API call
      MAX_API_CALLS: 1,        // Maximum API calls
      MERGE_DISTANCE: 100      // Distance to consider as duplicate
    }
  },
  PATHS: {
    IMAGES: 'counties/{countyName}/towns/{townName}/restaurants/{restaurantId}/images',
    ORIGINAL_MENUS: 'counties/{countyName}/towns/{townName}/restaurants/{restaurantId}/menus/original',
    PROCESSED_MENUS: 'counties/{countyName}/towns/{townName}/restaurants/{restaurantId}/menus/processed'
  },
  FIRESTORE: {
    COLLECTIONS: {
      ...COLLECTION_NAMES,
      MAPS_CACHE: 'maps_cache'
    }
  },
  MAPS: {
    CENTER: { lat: 25.0330, lng: 121.5654 }, // Default Taipei center
    BOUNDS: {
      TAIWAN: {
        north: 25.3,
        south: 21.9,
        east: 122.0,
        west: 120.0
      }
    },
    ZOOM: {
      DEFAULT: 14,
      MIN: 8,
      MAX: 20
    },
    LIBRARIES: ['places', 'geometry', 'drawing', 'marker'] as const,
    OPTIONS: {
      disableDefaultUI: true,
      clickableIcons: false,
      mapTypeControl: false,
      fullscreenControl: false,
      zoomControl: true,
      streetViewControl: false,
      gestureHandling: 'greedy' as const
    }
  },
  LOCATION: {
    VALIDATION: {
      PRECISION: 6,
      FALLBACK_RADIUS_KM: 50,
      MAX_CACHE_AGE_DAYS: 365
    },
    SEARCH_HIERARCHY: [
      'LOCAL_DATA',     // Check local county/town data first
      'CACHE',          // Then check location cache
      'GOOGLE_MAPS',    // Then try Google Geocoding
      'NEAREST_MATCH'   // Finally fallback to nearest known location
    ]
  },
  CACHE: {
    DURATION: 365 * 24 * 60 * 60 * 1000, // 365 days while building DB
    STRATEGY: {
      MEMORY: {
        TTL: 5 * 60 * 1000, // 5 minutes 
        MAX_ITEMS: 1000
      },
      FIRESTORE: {
        TTL: 365 * 24 * 60 * 60 * 1000, // 365 days while building DB
        COLLECTIONS: {
          LOCATIONS: COLLECTION_NAMES.LOCATION_CACHE,
          RESTAURANTS: COLLECTION_NAMES.RESTAURANTS,
          IMAGES: 'imageCaches'
        }
      }
    },
    GEOHASH: {
      LOCATION_PRECISION: 6,  // For locationCaches (street-level precision)
      METRICS_PRECISION: 5    // For cacheMetrics (area-level precision)
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