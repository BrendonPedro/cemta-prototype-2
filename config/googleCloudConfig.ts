// config/googleCloudConfig.ts

import { Storage, Bucket, LifecycleRule } from "@google-cloud/storage";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

// Types for better type safety
interface BucketConfig {
  name: string;
  isPublic: boolean;
  enableCors: boolean;
}

// Type guard for ApiError
interface ApiError extends Error {
  code?: number;
  errors?: Array<{
    message: string;
    domain: string;
    reason: string;
  }>;
}

// Constants
const CORS_CONFIG = [
  {
    maxAgeSeconds: 3600,
    method: ['GET', 'HEAD'],
    origin: ['*'],
    responseHeader: ['Content-Type'],
  },
];

const LIFECYCLE_RULE: LifecycleRule = {
  action: {
    type: "SetStorageClass",
    storageClass: "NEARLINE",
  },
  condition: {
    age: 365, // Move to Nearline storage after 365 days
  },
};

// Initialize storage and buckets only on server side
let storage: Storage | null = null;
let documentAiClient: DocumentProcessorServiceClient | null = null;
let labeledBucket: Bucket | null = null;
let unlabeledBucket: Bucket | null = null;
let originalMenuBucket: Bucket | null = null;
let processedMenuBucket: Bucket | null = null;
let restaurantImagesBucket: Bucket | null = null;
let yelpMenuBucket: Bucket | null = null;

// Helper Functions
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as ApiError).code === 'number'
  );
}

// Helper function to get bucket name with fallback
function getBucketName(envVar: string | undefined, fallback?: string): string {
  if (envVar) return envVar;
  if (fallback) return fallback;
  return '';
}

// Type assertion helpers
function assertStorage(storageInstance: Storage | null): asserts storageInstance is Storage {
  if (!storageInstance) {
    throw new Error('Storage is not initialized');
  }
}

function assertBucket(bucket: Bucket | null): asserts bucket is Bucket {
  if (!bucket) {
    throw new Error('Bucket is not initialized');
  }
}

async function setupBucket(bucket: Bucket | null, config: BucketConfig, retries = 3): Promise<boolean> {
  if (!bucket) {
    console.error(`Bucket is not initialized for ${config.name}`);
    return false;
  }
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Check if bucket exists first
      const [exists] = await bucket.exists();
      if (!exists) {
        console.error(`Bucket ${bucket.name} does not exist`);
        return false;
      }

      // Configure bucket in parallel
      await Promise.all([
        config.isPublic && makeBucketPublic(bucket),
        config.enableCors && bucket.setMetadata({ cors: CORS_CONFIG }),
        bucket.addLifecycleRule(LIFECYCLE_RULE),
      ]);

      console.log(`Successfully configured bucket ${bucket.name}`);
      return true;
    } catch (error: unknown) {
      // Type guard for ApiError
      if (isApiError(error) && error.code === 503 && attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Retry attempt ${attempt} for bucket ${bucket.name} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      console.error(`Error configuring bucket ${bucket.name}:`, error);
      return false;
    }
  }
  return false;
}

// Function to make bucket public using IAM policy
async function makeBucketPublic(bucket: Bucket) {
  try {
    await bucket.iam.setPolicy({
      bindings: [
        {
          role: 'roles/storage.objectViewer',
          members: ['allUsers'],
        },
      ],
    });
  } catch (error) {
    console.error(`Error making bucket ${bucket.name} public:`, error);
    throw error;
  }
}

// Initialize only on server side
if (typeof window === 'undefined') {
  // Validate environment variables
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
    throw new Error("Missing GOOGLE_CLOUD_PROJECT_ID environment variable");
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS environment variable");
  }

  if (!process.env.GOOGLE_CLOUD_STORAGE_BUCKET_RESTAURANT_IMAGES) {
    console.error('Missing GOOGLE_CLOUD_STORAGE_BUCKET_RESTAURANT_IMAGES environment variable');
  }

  const { Storage } = require('@google-cloud/storage');
  const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');

  storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });

  assertStorage(storage); // Assert storage is initialized before using it

  documentAiClient = new DocumentProcessorServiceClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });

  // Initialize bucket names
  const bucketNames = {
    labeled: getBucketName(process.env.GOOGLE_CLOUD_STORAGE_BUCKET_LABELED),
    unlabeled: getBucketName(process.env.GOOGLE_CLOUD_STORAGE_BUCKET_ORIGINAL_MENUS),
    originalMenu: getBucketName(process.env.GOOGLE_CLOUD_STORAGE_BUCKET_ORIGINAL_MENUS),
    processedMenu: getBucketName(process.env.GOOGLE_CLOUD_STORAGE_BUCKET_PROCESSED_MENUS),
    restaurantImages: getBucketName(process.env.GOOGLE_CLOUD_STORAGE_BUCKET_RESTAURANT_IMAGES),
    yelpMenu: getBucketName(process.env.GOOGLE_CLOUD_STORAGE_BUCKET_YELP_MENUS || "menu_uploads_yelp_cemta"),
  };

  // Validate all bucket names
  Object.entries(bucketNames).forEach(([key, value]) => {
    if (!value) {
      throw new Error(`Missing bucket name for ${key}`);
    }
  });

  try {
    // Initialize buckets
    labeledBucket = storage.bucket(bucketNames.labeled);
    unlabeledBucket = storage.bucket(bucketNames.unlabeled);
    originalMenuBucket = storage.bucket(bucketNames.originalMenu);
    processedMenuBucket = storage.bucket(bucketNames.processedMenu);
    restaurantImagesBucket = storage.bucket(bucketNames.restaurantImages);
    yelpMenuBucket = storage.bucket(bucketNames.yelpMenu);

    // Verify all buckets were initialized
    assertBucket(labeledBucket);
    assertBucket(unlabeledBucket);
    assertBucket(originalMenuBucket);
    assertBucket(processedMenuBucket);
    assertBucket(restaurantImagesBucket);
    assertBucket(yelpMenuBucket);
  } catch (error) {
    console.error('Error initializing buckets:', error);
    throw error;
  }

  // Initialize all buckets with their configurations
  async function initializeBuckets() {
    const bucketConfigs = [
      { bucket: originalMenuBucket!, config: { name: 'originalMenu', isPublic: false, enableCors: true } },
      { bucket: processedMenuBucket!, config: { name: 'processedMenu', isPublic: false, enableCors: true } },
      { bucket: restaurantImagesBucket!, config: { name: 'restaurantImages', isPublic: true, enableCors: true } },
      { bucket: yelpMenuBucket!, config: { name: 'yelpMenu', isPublic: true, enableCors: true } },
      { bucket: labeledBucket!, config: { name: 'labeled', isPublic: false, enableCors: false } },
      { bucket: unlabeledBucket!, config: { name: 'unlabeled', isPublic: false, enableCors: false } },
    ];

    const results = await Promise.allSettled(
      bucketConfigs.map(async ({ bucket, config }) => {
        try {
          const success = await setupBucket(bucket, config);
          return { name: config.name, success };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error initializing ${config.name} bucket:`, errorMessage);
          return { name: config.name, success: false, error: errorMessage };
        }
      })
    );

    // Log results
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { name, success, error } = result.value;
        if (success) {
          console.log(`Successfully initialized ${name} bucket`);
        } else {
          console.warn(`Failed to initialize ${name} bucket${error ? `: ${error}` : ''}`);
        }
      } else {
        console.error(`Bucket initialization rejected:`, result.reason);
      }
    });
  }

  // Initialize everything
  (async () => {
    try {
      await initializeBuckets();
    } catch (error) {
      console.error("Error during initialization:", error);
      // Log error but don't throw - allow application to continue
    }
  })();
}

export {
  storage,
  documentAiClient,
  labeledBucket,
  unlabeledBucket,
  originalMenuBucket,
  processedMenuBucket,
  restaurantImagesBucket,
  yelpMenuBucket,
  setupBucket,
  isApiError,
  assertStorage,
  assertBucket
};

export type { ApiError, BucketConfig };