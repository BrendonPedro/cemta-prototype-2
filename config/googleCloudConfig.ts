// config/googleCloudConfig.ts
import { Storage } from "@google-cloud/storage";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";

async function setupBucket(bucket: any) {
  try {
    // Make bucket publicly readable
    await bucket.iam.updatePolicy({
      bindings: [
        {
          role: 'roles/storage.objectViewer',
          members: ['allUsers'],
        },
      ],
    });

    // Set CORS policy
    await bucket.setCorsConfiguration([
      {
        maxAgeSeconds: 3600,
        method: ['GET', 'HEAD'],
        origin: ['*'],
        responseHeader: ['Content-Type'],
      },
    ]);

    console.log(`Successfully configured bucket ${bucket.name}`);
  } catch (error) {
    console.error(`Error configuring bucket ${bucket.name}:`, error);
  }
}

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const primaryRegion = "asia-east1";

if (!projectId) {
  throw new Error("Missing GOOGLE_CLOUD_PROJECT_ID environment variable");
}

if (!keyFilename) {
  throw new Error(
    "Missing GOOGLE_APPLICATION_CREDENTIALS environment variable",
  );
}

const storage = new Storage({
  projectId,
  keyFilename,
});

const documentAiClient = new DocumentProcessorServiceClient({
  keyFilename,
});

function getBucketName(envVar: string | undefined): string {
  if (!envVar) {
    throw new Error(`Missing environment variable`);
  }
  return envVar.replace("gs://", "");
}

// Document AI Buckets
const labeledBucketName =
  process.env.GOOGLE_CLOUD_STORAGE_BUCKET_LABELED?.replace("gs://", "");
const unlabeledBucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET_ORIGINAL_MENUS?.replace(
  "gs://",
  "",
);

if (!labeledBucketName) {
  throw new Error(
    "Missing GOOGLE_CLOUD_STORAGE_BUCKET_LABELED environment variable",
  );
}

if (!unlabeledBucketName) {
  throw new Error("Missing GOOGLE_CLOUD_STORAGE_BUCKET_ORIGINAL_MENUS environment variable");
}

const labeledBucket = storage.bucket(labeledBucketName);
const unlabeledBucket = storage.bucket(unlabeledBucketName);

// Restaurant Image Cache Buckets
const originalMenuBucketName = getBucketName(
  process.env.GOOGLE_CLOUD_STORAGE_BUCKET_ORIGINAL_MENUS,
);
const processedMenuBucketName = getBucketName(
  process.env.GOOGLE_CLOUD_STORAGE_BUCKET_PROCESSED_MENUS,
);
const restaurantImagesBucketName = getBucketName(
  process.env.GOOGLE_CLOUD_STORAGE_BUCKET_RESTAURANT_IMAGES,
);
const yelpMenuBucketName = getBucketName(
  process.env.GOOGLE_CLOUD_STORAGE_BUCKET_YELP_MENUS || "menu_uploads_yelp_cemta"
);

if (
  !originalMenuBucketName ||
  !processedMenuBucketName ||
  !restaurantImagesBucketName ||
  !yelpMenuBucketName
) {
  throw new Error(
    "Missing one or more required GCP bucket environment variables",
  );
}

const originalMenuBucket = storage.bucket(originalMenuBucketName);
const processedMenuBucket = storage.bucket(processedMenuBucketName);
const restaurantImagesBucket = storage.bucket(restaurantImagesBucketName);
const yelpMenuBucket = storage.bucket(yelpMenuBucketName);

// Set up replication
async function setupReplication() {
  try {
    const buckets = [
      originalMenuBucket,
      processedMenuBucket,
      restaurantImagesBucket,
      yelpMenuBucket
    ];

    for (const bucket of buckets) {
      await bucket.addLifecycleRule({
        action: { type: "SetStorageClass", storageClass: "NEARLINE" },
        condition: {
          age: 30, // Move to Nearline storage after 30 days
        },
      });
    }

    console.log("Successfully set up replication rules");
  } catch (error) {
    console.error("Error setting up replication:", error);
    throw new Error(
      "Failed to set up replication. Check your permissions and bucket configuration.",
    );
  }
}

// Test bucket access
async function testBucketAccess() {
  try {
    await Promise.all([
      originalMenuBucket.exists(),
      processedMenuBucket.exists(),
      restaurantImagesBucket.exists(),
      labeledBucket.exists(),
      unlabeledBucket.exists(),
      yelpMenuBucket.exists(),
    ]);
    console.log("Successfully connected to all GCS buckets");
  } catch (error) {
    console.error("Error accessing GCS buckets:", error);
    throw new Error(
      "Failed to access GCS buckets. Check your permissions and bucket names.",
    );
  }
}

// Initialize buckets and test access
(async () => {
  try {
    await Promise.all([
      setupBucket(restaurantImagesBucket),
      setupBucket(originalMenuBucket),
      setupBucket(processedMenuBucket),
      setupBucket(yelpMenuBucket),
    ]);
    await setupReplication();
    await testBucketAccess();
  } catch (error) {
    console.error("Error during initialization:", error);
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
  yelpMenuBucket,  // Add export for Yelp menu bucket
};