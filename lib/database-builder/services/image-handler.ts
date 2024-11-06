// lib/database-builder/services/image-handler.ts

"use client";

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { ImageUploadMetadata } from '../types';

export function useImageUploader() {
  const { firebaseToken } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (
    imageUrl: string,
    metadata: ImageUploadMetadata
  ): Promise<string | null> => {
    if (!firebaseToken) {
      setError('No Firebase token available');
      return null;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/storage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          imageUrl,
          metadata: {
            ...metadata,
            contentType: metadata.contentType || 'image/jpeg',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Successfully uploaded image for ${metadata.restaurantId}`);
      return data.url;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
      setError(errorMessage);
      console.error(errorMessage);
      return null;

    } finally {
      setProcessing(false);
    }
  };

  const uploadBatch = async (
    images: Array<{
      url: string;
      metadata: ImageUploadMetadata;
    }>
  ): Promise<Map<string, string>> => {
    if (!firebaseToken) {
      setError('No Firebase token available');
      return new Map<string, string>();
    }

    setProcessing(true);
    setError(null);

    const results = new Map<string, string>();

    try {
      const response = await fetch('/api/storage/batch', {
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

      if (!response.ok) {
        throw new Error(`Batch upload failed: ${response.statusText}`);
      }

      const { urls } = await response.json();
      images.forEach(({ metadata }, index) => {
        if (urls[index]) {
          results.set(metadata.restaurantId, urls[index]);
        }
      });

      console.log(`✅ Successfully uploaded ${urls.length} images in batch`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload images';
      setError(errorMessage);
      console.error(errorMessage);

    } finally {
      setProcessing(false);
    }

    return results;
  };

  return {
    uploadImage,
    uploadBatch,
    processing,
    error,
    hasToken: !!firebaseToken,
  };
}
