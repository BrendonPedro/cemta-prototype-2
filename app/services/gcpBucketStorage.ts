// app/services/gcpBucketStorage.ts

import {
  storage,
  originalMenuBucket,
  processedMenuBucket,
  restaurantImagesBucket,
  yelpMenuBucket,
} from "@/config/googleCloudConfig";

interface UploadOptions {
  contentType: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}
// Common validation and path generation functions
function validateInputs(
  fileName: string,
  imageBuffer: Buffer,
  contentType: string
): void {
  if (!fileName) throw new Error('Filename is required');
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) throw new Error('Valid image buffer is required');
  if (!contentType) throw new Error('Content type is required');
}

function generateFilePath(parts: string[]): string {
  return parts.filter(Boolean).join('/');
}

async function uploadWithRetry(
  bucket: any,
  filePath: string,
  imageBuffer: Buffer,
  options: UploadOptions,
  maxRetries = 3
): Promise<string> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const file = bucket.file(filePath);
      await file.save(imageBuffer, {
        metadata: {
          contentType: options.contentType,
          cacheControl: options.cacheControl || 'public, max-age=3600',
          ...options.metadata,
        },
      });

      // Return the public URL (assuming the bucket has public access configured)
      return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    } catch (error) {
      lastError = error;
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw lastError;
}


export async function uploadOriginalMenu(
  userId: string,
  restaurantId: string,
  fileName: string,
  imageBuffer: Buffer,
  contentType: string,
): Promise<string> {
  validateInputs(fileName, imageBuffer, contentType);
  
  const filePath = generateFilePath([userId, restaurantId, `original_${Date.now()}_${fileName}`]);
  
  return uploadWithRetry(originalMenuBucket, filePath, imageBuffer, {
    contentType,
    cacheControl: 'private, max-age=3600',
    metadata: {
      userId,
      restaurantId
    }
  });
}

export async function uploadProcessedMenu(
  userId: string,
  restaurantId: string,
  fileName: string,
  imageBuffer: Buffer,
  contentType: string,
): Promise<string> {
  validateInputs(fileName, imageBuffer, contentType);
  
  const filePath = generateFilePath([userId, restaurantId, `processed_${Date.now()}_${fileName}`]);
  
  return uploadWithRetry(processedMenuBucket, filePath, imageBuffer, {
    contentType,
    cacheControl: 'private, max-age=3600',
    metadata: {
      userId,
      restaurantId
    }
  });
}

export async function uploadRestaurantImage(
  restaurantId: string,
  imageBuffer: Buffer,
  contentType: string,
  source: 'google' | 'yelp' | 'user' = 'user'
): Promise<string> {
  if (!restaurantId) throw new Error('Restaurant ID is required');
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) throw new Error('Valid image buffer is required');
  
  const fileName = `${restaurantId}/${Date.now()}_${source}.jpg`;
  
  return uploadWithRetry(restaurantImagesBucket, fileName, imageBuffer, {
    contentType,
    cacheControl: 'public, max-age=31536000', // 1 year
    metadata: {
      source,
      restaurantId,
    },
  });
}

export async function uploadYelpMenu(
  userId: string,
  restaurantId: string,
  imageBuffer: Buffer,
  contentType: string,
): Promise<string> {
  validateInputs(restaurantId, imageBuffer, contentType);
  
  const fileName = generateFilePath([userId, restaurantId, `${Date.now()}_yelp_menu.jpg`]);
  
  return uploadWithRetry(yelpMenuBucket, fileName, imageBuffer, {
    contentType,
    cacheControl: 'public, max-age=2592000', // 30 days
    metadata: {
      source: 'yelp',
      userId,
      restaurantId,
    }
  });
}

export async function uploadImageToBucket(
  fileName: string,
  imageBuffer: Buffer,
  contentType: string = 'image/jpeg',
  bucket = restaurantImagesBucket
): Promise<string> {
  if (!fileName) throw new Error('Filename is required');
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) throw new Error('Valid image buffer is required');
  
  return uploadWithRetry(bucket, fileName, imageBuffer, {
    contentType,
    cacheControl: 'public, max-age=31536000',
  });
}

export async function getImageFromBucket(
  fileName: string,
  bucket = restaurantImagesBucket
): Promise<Buffer | null> {
  try {
    validateInputs(fileName, Buffer.from([]), 'image/jpeg');
    
    const file = bucket.file(fileName);
    const [exists] = await file.exists();
    
    if (!exists) {
      console.warn(`File ${fileName} does not exist in bucket ${bucket.name}`);
      return null;
    }

    const [fileContent] = await file.download();
    return fileContent;
  } catch (error) {
    console.error(`Error downloading file ${fileName} from bucket ${bucket.name}:`, error);
    return null;
  }
}

// Helper function to check if an image exists
export async function checkImageExists(
  fileName: string,
  bucket = restaurantImagesBucket
): Promise<boolean> {
  try {
    const file = bucket.file(fileName);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error(`Error checking if file ${fileName} exists:`, error);
    return false;
  }
}

// Also, let's add a function to verify bucket permissions
async function verifyBucketPermissions(bucket: any): Promise<boolean> {
  try {
    const [policy] = await bucket.iam.getPolicy({ requestedPolicyVersion: 3 });
    const hasPublicAccess = policy.bindings?.some(
      (binding: { role: string; members: string[] }) => 
        binding.role === 'roles/storage.objectViewer' &&
        binding.members.includes('allUsers')
    );
    return hasPublicAccess;
  } catch (error) {
    console.error(`Error verifying bucket permissions for ${bucket.name}:`, error);
    return false;
  }
}

// You might want to add this to your initialization code in googleCloudConfig.ts:
async function verifyAllBuckets() {
  const buckets = [
    restaurantImagesBucket,
    originalMenuBucket,
    processedMenuBucket,
    yelpMenuBucket
  ];

  for (const bucket of buckets) {
    const hasPublicAccess = await verifyBucketPermissions(bucket);
    if (!hasPublicAccess) {
      console.warn(`Warning: Bucket ${bucket.name} may not have public access configured correctly`);
    }
  }
}