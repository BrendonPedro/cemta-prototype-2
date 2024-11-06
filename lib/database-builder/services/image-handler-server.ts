// lib/database-builder/services/image-handler-server.ts

import fetch from 'node-fetch'; // Use node-fetch for server-side fetch
import { ImageProcessingConfig, ImageUploadMetadata, SingleUploadResponse, BatchUploadResponse  } from '../types';

// Default configuration
const DEFAULT_CONFIG: ImageProcessingConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  maxConcurrent: 5,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',  //change in production
};

// Function to process and upload a single image
export async function processAndUploadImage(
  imageUrl: string,
  metadata: ImageUploadMetadata,
  firebaseToken: string,
  config: ImageProcessingConfig = DEFAULT_CONFIG
): Promise<string | null> {
  let retries = 0;

  while (retries < config.maxRetries) {
    try {
      // Fetch the image data
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const imageBuffer = await response.buffer();

      // Prepare the request to your image upload API
        const uploadResponse = await fetch(`${config.baseUrl}/api/storage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          imageData: imageBuffer.toString('base64'),
          metadata: {
            ...metadata,
            contentType: metadata.contentType || 'image/jpeg',
          },
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Add type annotation here
const data = (await uploadResponse.json()) as { url: string };
console.log(`✅ Successfully uploaded image for ${metadata.restaurantId}`);
return data.url;

    } catch (error) {
      console.error(`Attempt ${retries + 1} failed:`, error);
      retries++;

      if (retries === config.maxRetries) {
        console.error(`Failed to upload image after ${retries} attempts`);
        return null;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, config.retryDelay * retries));
    }
  }

  return null;
}

// Function to process and upload a batch of images
export async function processBatchImages(
  images: Array<{
    url: string;
    metadata: ImageUploadMetadata;
  }>,
  firebaseToken: string,
  config: ImageProcessingConfig = DEFAULT_CONFIG
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  try {
    const uploadResponse = await fetch(`${config.baseUrl}/api/storage/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseToken}`,
      },
      body: JSON.stringify({
        images: images.map(({ url, metadata }) => ({
          imageUrl: url,
          metadata: {
            ...metadata,
            contentType: metadata.contentType || 'image/jpeg',
          },
        })),
      }),
    });

    if (!uploadResponse.ok) {
      throw new Error(`Batch upload failed: ${uploadResponse.statusText}`);
    }

    const data = (await uploadResponse.json()) as BatchUploadResponse;
    const { urls } = data;
    images.forEach(({ metadata }, index) => {
      if (urls[index]) {
        results.set(metadata.restaurantId, urls[index]);
      }
    });

    console.log(`✅ Successfully uploaded ${urls.length} images in batch`);
  } catch (error) {
    console.error('Error processing batch:', error);
  }

  return results;
}
