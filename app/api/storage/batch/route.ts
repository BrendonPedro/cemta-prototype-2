// app/api/storage/batch/route.ts

import { NextRequest, NextResponse } from "next/server";
import admin from "@/config/firebaseAdmin";
import { DecodedIdToken } from "firebase-admin/auth";
import { saveImageUrlCache } from "@/app/services/firebaseFirestore";
import {
  restaurantImagesBucket,
  originalMenuBucket,
  processedMenuBucket,
  yelpMenuBucket,
} from "@/config/googleCloudConfig";

// Define the metadata interface
interface StorageMetadata {
  userId?: string;
  restaurantId?: string;
  countyName?: string;
  townName?: string;
  filename: string;
  contentType: string;
  source: "google" | "yelp" | "user";
  type: "menu" | "restaurant" | "processed";
}

interface BatchImageUploadRequest {
  images: Array<{
    imageUrl: string;
    metadata: StorageMetadata;
  }>;
}

// Helper function to get the bucket based on metadata
function getBucket(type: string, source: string) {
  const bucket = restaurantImagesBucket;
  console.log('Using bucket:', bucket.name);
  return bucket;
}

// Helper function to get image data from URL
async function getImageFromUrl(imageUrl: string): Promise<Buffer> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Error fetching image:", error);
    throw new Error("Failed to fetch image from URL");
  }
}

// Helper function to get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Authentication helper
async function verifyAuth(req: NextRequest): Promise<DecodedIdToken | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn("No authorization header");
      return null;
    }

    const token = authHeader.split("Bearer ")[1];
    if (!token) {
      console.warn("No token provided");
      return null;
    }

    // Verify token
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
  }
}


export async function POST(req: NextRequest) {
  try {
    // Authentication
    const decodedToken = await verifyAuth(req);
    if (!decodedToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { images } = body;

    if (!images || !Array.isArray(images)) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    console.log(`Processing ${images.length} images`);

    // Process each image
    const uploadResults = await Promise.all(
      images.map(async ({ imageData, metadata }) => {
        try {
          if (!imageData || !metadata) {
            console.error('Missing image data or metadata');
            return null;
          }

          const bucket = getBucket(
            metadata.type || "restaurant",
            metadata.source || "google"
          );

          // Create buffer from base64
          const imageBuffer = Buffer.from(imageData, 'base64');

          // Construct file path
          const filePath = `counties/${metadata.countyName}/${metadata.townName}/restaurants/${metadata.restaurantId}/${Date.now()}.jpg`;
          console.log('Uploading to path:', filePath);

          const file = bucket.file(filePath);
          
          await file.save(imageBuffer, {
            metadata: {
              contentType: 'image/jpeg',
              metadata: {
                userId: decodedToken.uid,
                ...metadata,
              },
            },
          });

          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
          console.log('File uploaded successfully:', publicUrl);

          // Save to cache
          await saveImageUrlCache(decodedToken.uid, filePath, publicUrl);

          return publicUrl;
        } catch (error) {
          console.error("Error processing image:", error);
          return null;
        }
      })
    );

    const validUrls = uploadResults.filter((url): url is string => url !== null);
    console.log(`Successfully uploaded ${validUrls.length} images`);

    return NextResponse.json({ urls: validUrls });
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
