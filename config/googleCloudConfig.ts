// config/googleCloudConfig.ts

import { Storage, Bucket, LifecycleRule } from "@google-cloud/storage";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

// Types for better type safety
interface BucketConfig {
  name: string;
  isPublic: boolean;
  enableCors: boolean;
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
    age: 30, // Move to Nearline storage after 30 days
  },
};

async function setupBucket(bucket: Bucket, config: BucketConfig) {
  try {
    // Check if bucket exists first
    const [exists] = await bucket.exists();
    if (!exists) {
      console.error(`Bucket ${bucket.name} does not exist`);
      return false;
    }

    // Configure bucket in parallel
    await Promise.all([
      // Make public if needed using IAM policy
      config.isPublic && makeBucketPublic(bucket),
      // Set CORS if enabled
      config.enableCors && bucket.setMetadata({ cors: CORS_CONFIG }),
      // Set lifecycle rules
      bucket.addLifecycleRule(LIFECYCLE_RULE),
    ]);

    console.log(`Successfully configured bucket ${bucket.name}`);
    return true;
  } catch (error) {
    console.error(`Error configuring bucket ${bucket.name}:`, error);
    // Implement retry logic or handle specific errors
    return false;
  }
}

// Function to make bucket public using IAM policy
async function makeBucketPublic(bucket: Bucket) {
  try {
    // Get the current IAM policy
    const [policy] = await bucket.iam.getPolicy({ requestedPolicyVersion: 3 });

    // Check if the binding already exists
    const bindingExists = policy.bindings.some(binding =>
      binding.role === 'roles/storage.objectViewer' &&
      binding.members.includes('allUsers')
    );

    if (!bindingExists) {
      // Add a binding to grant allUsers the storage.objectViewer role
      policy.bindings.push({
        role: 'roles/storage.objectViewer',
        members: ['allUsers'],
      });

      // Set the updated IAM policy
      await bucket.iam.setPolicy(policy);
      console.log(`Bucket ${bucket.name} is now public.`);
    } else {
      console.log(`Bucket ${bucket.name} is already public.`);
    }
  } catch (error) {
    console.error(`Error making bucket ${bucket.name} public:`, error);
    throw error;
  }
}

// Validate environment variables
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const primaryRegion = "asia-east1";

if (!projectId) {
  throw new Error("Missing GOOGLE_CLOUD_PROJECT_ID environment variable");
}

if (!keyFilename) {
  throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS environment variable");
}

// Initialize Storage
const storage = new Storage({ projectId, keyFilename });
const documentAiClient = new DocumentProcessorServiceClient({ keyFilename });

// Helper function to clean bucket names
function getBucketName(envVar: string | undefined): string {
  if (!envVar) {
    throw new Error(`Missing environment variable`);
  }
  return envVar.replace("gs://", "");
}

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

// Initialize buckets
const labeledBucket = storage.bucket(bucketNames.labeled);
const unlabeledBucket = storage.bucket(bucketNames.unlabeled);
const originalMenuBucket = storage.bucket(bucketNames.originalMenu);
const processedMenuBucket = storage.bucket(bucketNames.processedMenu);
const restaurantImagesBucket = storage.bucket(bucketNames.restaurantImages);
const yelpMenuBucket = storage.bucket(bucketNames.yelpMenu);

// Initialize all buckets with their configurations
async function initializeBuckets() {
  const bucketConfigs = [
    { bucket: originalMenuBucket, config: { name: 'originalMenu', isPublic: false, enableCors: true } },
    { bucket: processedMenuBucket, config: { name: 'processedMenu', isPublic: false, enableCors: true } },
    { bucket: restaurantImagesBucket, config: { name: 'restaurantImages', isPublic: true, enableCors: true } },
    { bucket: yelpMenuBucket, config: { name: 'yelpMenu', isPublic: true, enableCors: true } },
    { bucket: labeledBucket, config: { name: 'labeled', isPublic: false, enableCors: false } },
    { bucket: unlabeledBucket, config: { name: 'unlabeled', isPublic: false, enableCors: false } },
  ];

  const results = await Promise.allSettled(
    bucketConfigs.map(({ bucket, config }) => setupBucket(bucket, config))
  );

  // Log results
  results.forEach((result, index) => {
    const bucketName = bucketConfigs[index].config.name;
    if (result.status === 'fulfilled') {
      if (result.value) {
        console.log(`Successfully initialized ${bucketName} bucket`);
      } else {
        console.warn(`Failed to initialize ${bucketName} bucket`);
      }
    } else {
      console.error(`Error initializing ${bucketName} bucket:`, result.reason);
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

export {
  storage,
  documentAiClient,
  labeledBucket,
  unlabeledBucket,
  originalMenuBucket,
  processedMenuBucket,
  restaurantImagesBucket,
  yelpMenuBucket,
};
