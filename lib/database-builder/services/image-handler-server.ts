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
    for (let i = 0; i < images.length; i += config.maxConcurrent) {
      const batch = images.slice(i, i + config.maxConcurrent);
      
      const processedBatch = await Promise.all(
        batch.map(async ({ url, metadata }) => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const base64Data = Buffer.from(arrayBuffer).toString('base64');

            console.log(`Successfully fetched and encoded image for ${metadata.restaurantId}`);

            return {
              imageUrl: url,
              imageData: base64Data,
              metadata: {
                ...metadata,
                filename: `${metadata.countyName}/${metadata.townName}/${metadata.restaurantId}/${Date.now()}.jpg`,
                contentType: 'image/jpeg'
              }
            };
          } catch (error) {
            console.error(`Failed to process image for ${metadata.restaurantId}:`, error);
            return null;
          }
        })
      );

      const validBatch = processedBatch.filter((item): item is NonNullable<typeof item> => item !== null);

      if (validBatch.length > 0) {
        const uploadResponse = await fetch(`${config.baseUrl}/api/storage/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firebaseToken}`,
          },
          body: JSON.stringify({
            images: validBatch
          }),
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.text();
          throw new Error(`Batch upload failed: ${errorData}`);
        }

        const data = await uploadResponse.json() as BatchUploadResponse;
        console.log('Batch upload response:', data);

        if (data.urls && Array.isArray(data.urls)) {
          data.urls.forEach((url: string, index: number) => {
            if (url && validBatch[index]) {
              const restaurantId = validBatch[index].metadata.restaurantId;
              results.set(restaurantId, url);
              console.log(`✅ Saved image URL for restaurant ${restaurantId}:`, url);
            }
          });
        }
      }
    }

    console.log(`✅ Successfully processed and uploaded ${results.size} images in total`);
  } catch (error) {
    console.error('Error processing batch:', error);
  }

  return results;
}

// Types for batch processing
interface ProcessedImage {
  imageUrl: string;
  imageData: string;
  metadata: ImageUploadMetadata & {
    filename: string;
    contentType: string;
  };
}

type ValidBatchItem = NonNullable<ProcessedImage>;