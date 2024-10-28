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
      CACHE: 'locationCaches'
    }
  },
  PROCESSING: {
    START_DATE: '2024-01-01',
    TOTAL_LOCATIONS: 500, // Adjust based on your needs
    BATCH_SIZE: 50
  }
};