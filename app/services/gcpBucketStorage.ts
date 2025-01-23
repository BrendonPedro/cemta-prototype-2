// app/services/gcpBucketStorage.ts

import type { Bucket } from '@google-cloud/storage';
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

// Helper function to check if we're on the server side
const isServer = typeof window === 'undefined';

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

export function getImageUrl(fileName: string, bucketName: string): string {
  // Map old bucket names to new ones
  const bucketMap: Record<string, string> = {
    'menu_documentai_labeled_cemta': 'new-menu-documentai-labeled',
    'menu_uploads_original_cemta': 'new-menu-uploads-original',
    'menu_uploads_processed_cemta': 'new-menu-uploads-processed',
    'restaurant_images_cemta': 'new-restaurant-images',
    'menu_uploads_yelp_cemta': 'new-menu-uploads-yelp'
  };

  const newBucketName = bucketMap[bucketName] || bucketName;
  return `https://storage.googleapis.com/${newBucketName}/${fileName}`;
}

async function uploadWithRetry(
  bucket: Bucket | null,
  filePath: string,
  imageBuffer: Buffer,
  options: UploadOptions,
  maxRetries = 3
): Promise<string> {
  if (!isServer) {
    throw new Error('Upload functions can only be called on the server side');
  }

  if (!bucket) {
    throw new Error('Bucket is not initialized');
  }

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
  if (!isServer) {
    throw new Error('This function can only be called on the server side');
  }

  if (!originalMenuBucket) {
    throw new Error('Original menu bucket is not initialized');
  }

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
  if (!isServer) {
    throw new Error('This function can only be called on the server side');
  }

  if (!processedMenuBucket) {
    throw new Error('Processed menu bucket is not initialized');
  }

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
  if (!isServer) {
    throw new Error('This function can only be called on the server side');
  }

  if (!restaurantImagesBucket) {
    throw new Error('Restaurant images bucket is not initialized');
  }

  if (!restaurantId) throw new Error('Restaurant ID is required');
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) throw new Error('Valid image buffer is required');
  
  const fileName = `${restaurantId}/${Date.now()}_${source}.jpg`;
  
  return uploadWithRetry(restaurantImagesBucket, fileName, imageBuffer, {
    contentType,
    cacheControl: 'public, max-age=31536000',
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
  if (!isServer) {
    throw new Error('This function can only be called on the server side');
  }

  if (!yelpMenuBucket) {
    throw new Error('Yelp menu bucket is not initialized');
  }

  validateInputs(restaurantId, imageBuffer, contentType);
  
  const fileName = generateFilePath([userId, restaurantId, `${Date.now()}_yelp_menu.jpg`]);
  
  return uploadWithRetry(yelpMenuBucket, fileName, imageBuffer, {
    contentType,
    cacheControl: 'public, max-age=2592000',
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
  if (!isServer) {
    throw new Error('This function can only be called on the server side');
  }
  if (!fileName) throw new Error('Filename is required');
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) throw new Error('Valid image buffer is required');
  
  return uploadWithRetry(bucket, fileName, imageBuffer, {
    contentType,
    cacheControl: 'public, max-age=31536000',
  });
}


export async function getImageFromBucket(
  fileName: string,
  bucket: Bucket | null = restaurantImagesBucket
): Promise<Buffer | null> {
  if (!isServer) {
    throw new Error('This function can only be called on the server side');
  }

  if (!bucket) {
    throw new Error('Bucket is not initialized');
  }

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
  bucket: Bucket | null = restaurantImagesBucket
): Promise<boolean> {
  if (!isServer) {
    throw new Error('This function can only be called on the server side');
  }

  if (!bucket) {
    throw new Error('Bucket is not initialized');
  }

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
async function verifyBucketPermissions(bucket: Bucket | null): Promise<boolean> {
  if (!isServer) {
    throw new Error('This function can only be called on the server side');
  }

  if (!bucket) {
    return false;
  }

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
export async function verifyAllBuckets() {
  if (!isServer) {
    throw new Error('This function can only be called on the server side');
  }

  const buckets = [
    restaurantImagesBucket,
    originalMenuBucket,
    processedMenuBucket,
    yelpMenuBucket
  ].filter((bucket): bucket is Bucket => {
    if (!bucket) {
      console.warn('Found uninitialized bucket');
      return false;
    }
    return true;
  });

  for (const bucket of buckets) {
    const hasPublicAccess = await verifyBucketPermissions(bucket);
    if (!hasPublicAccess) {
      console.warn(`Warning: Bucket ${bucket.name} may not have public access configured correctly`);
    }
  }
}