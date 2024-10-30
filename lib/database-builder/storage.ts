// lib/database-builder/storage.ts

import { Storage } from '@google-cloud/storage';
import { CONFIG } from './config';
import { restaurantImagesBucket } from '@/config/googleCloudConfig';

interface ImageMetadata {
  countyName: string;
  townName: string;
  restaurantId: string;
  filename: string;
  contentType: string;
  source?: 'google' | 'yelp' | 'user';
}

function generateStoragePath(metadata: ImageMetadata): string {
  const { countyName, townName, restaurantId, filename } = metadata;
  return `counties/${countyName.toLowerCase()}/towns/${townName.toLowerCase()}/restaurants/${restaurantId}/images/${filename}`;
}

export async function uploadImage(
  storage: Storage,
  imageBuffer: Buffer,
  metadata: ImageMetadata
): Promise<string> {
  try {
    if (!restaurantImagesBucket) {
      console.warn('RestaurantImagesBucket not initialized, skipping upload');
      return '';
    }

    const filePath = generateStoragePath(metadata);
    const file = restaurantImagesBucket.file(filePath);

    await file.save(imageBuffer, {
      metadata: {
        contentType: metadata.contentType,
        metadata: {
          county: metadata.countyName,
          town: metadata.townName,
          restaurantId: metadata.restaurantId,
          source: metadata.source || 'google'
        }
      }
    });

    return `https://storage.googleapis.com/${restaurantImagesBucket.name}/${filePath}`;
  } catch (error) {
    console.error('Error uploading image:', error);
    return '';
  }
}

export async function uploadImageWithRetry(
  storage: Storage,
  imageBuffer: Buffer,
  metadata: ImageMetadata,
  maxRetries = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = await uploadImage(storage, imageBuffer, metadata);
      if (url) return url;
      
      // If we got an empty URL but no error, that means storage wasn't configured
      throw new Error('Storage not properly configured');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Upload attempt ${attempt} failed:`, error);
      
      // Don't wait on the last attempt
      if (attempt === maxRetries) break;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  // After all retries failed
  console.error('Max retries reached for image upload');
  if (lastError) console.error('Final error:', lastError);
  return '';
}

// Helper to verify storage configuration
export async function verifyStorageConfig(): Promise<boolean> {
  if (!restaurantImagesBucket) {
    console.error('Restaurant images bucket not initialized');
    return false;
  }

  try {
    // Check if bucket exists and is accessible
    const [exists] = await restaurantImagesBucket.exists();
    if (!exists) {
      console.error('Restaurant images bucket does not exist');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying storage configuration:', error);
    return false;
  }
}