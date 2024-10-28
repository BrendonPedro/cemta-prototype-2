// app/lib/database-builder/storage.ts

import { Storage } from '@google-cloud/storage';
import { CONFIG } from './config';

export async function uploadImage(
  storage: Storage,
  imageBuffer: Buffer,
  metadata: {
    countyName: string;
    townName: string;
    restaurantId: string;
    filename: string;
    contentType: string;
  }
): Promise<string> {
  const { countyName, townName, restaurantId, filename, contentType } = metadata;
  
  const filePath = CONFIG.PATHS.IMAGES
    .replace('{countyName}', countyName.toLowerCase())
    .replace('{townName}', townName.toLowerCase())
    .replace('{restaurantId}', restaurantId)
    + `/${filename}`;

  const bucket = storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET!);
  const file = bucket.file(filePath);

  await file.save(imageBuffer, {
    metadata: {
      contentType,
      metadata: { county: countyName, town: townName, restaurantId }
    }
  });

  return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
}