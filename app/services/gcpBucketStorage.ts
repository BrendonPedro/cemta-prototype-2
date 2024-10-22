// app/services/gcpBucketStorage.ts

import {
  storage,
  originalMenuBucket,
  processedMenuBucket,
  restaurantImagesBucket,
  yelpMenuBucket,
} from "@/config/googleCloudConfig";

export async function uploadOriginalMenu(
  userId: string,
  restaurantId: string,
  fileName: string,
  imageBuffer: Buffer,
  contentType: string,
): Promise<string> {
  const filePath = `${userId}/${restaurantId}/${fileName}`;
  const file = originalMenuBucket.file(filePath);

  await file.save(imageBuffer, {
    metadata: { contentType },
  });

  // Return a signed URL that expires in 15 minutes
  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  });

  return signedUrl;
}

export async function uploadProcessedMenu(
  userId: string,
  restaurantId: string,
  fileName: string,
  imageBuffer: Buffer,
  contentType: string,
): Promise<string> {
  const filePath = `${userId}/${restaurantId}/${fileName}`;
  const file = processedMenuBucket.file(filePath);

  await file.save(imageBuffer, {
    metadata: { contentType },
  });

  // Return a signed URL that expires in 1 hour
  const [signedUrl] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });

  return signedUrl;
}

export async function uploadRestaurantImage(
  restaurantId: string,
  imageBuffer: Buffer,
  contentType: string,
): Promise<string> {
  const fileName = `${restaurantId}.jpg`;
  const file = restaurantImagesBucket.file(fileName);

  await file.save(imageBuffer, {
    metadata: { contentType },
    public: true,
  });

  return `https://storage.googleapis.com/${restaurantImagesBucket.name}/${fileName}`;
}

export async function uploadYelpMenu(
  userId: string,
  restaurantId: string,
  imageBuffer: Buffer,
  contentType: string,
): Promise<string> {
  const fileName = `${userId}/${restaurantId}/${Date.now()}_yelp_menu.jpg`;
  const file = yelpMenuBucket.file(fileName);

  await file.save(imageBuffer, {
    metadata: { contentType },
    public: true,
  });

  return `https://storage.googleapis.com/${yelpMenuBucket.name}/${fileName}`;
}

export async function uploadImageToBucket(
  fileName: string,
  imageBuffer: Buffer,
  contentType: string,
  bucket = restaurantImagesBucket // Default to restaurant images bucket
): Promise<string> {
  const file = bucket.file(fileName);

  await file.save(imageBuffer, {
    metadata: { contentType },
    public: true,
  });

  return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
}

export async function getImageFromBucket(
  fileName: string,
  bucket = restaurantImagesBucket // Default to restaurant images bucket
): Promise<Buffer | null> {
  const file = bucket.file(fileName);

  try {
    const [fileContent] = await file.download();
    return fileContent;
  } catch (error) {
    console.error(`Error downloading file ${fileName} from bucket:`, error);
    return null;
  }
}