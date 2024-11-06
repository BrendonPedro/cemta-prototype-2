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
function getBucket(
  type: StorageMetadata["type"],
  source: StorageMetadata["source"]
) {
  switch (type) {
    case "menu":
      return source === "yelp" ? yelpMenuBucket : originalMenuBucket;
    case "processed":
      return processedMenuBucket;
    case "restaurant":
    default:
      return restaurantImagesBucket;
  }
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

    // Parse request body
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { message: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    const { images } = (await req.json()) as BatchImageUploadRequest;

    // Validate images array
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { message: "Invalid request body: 'images' array is required" },
        { status: 400 }
      );
    }

    // Process each image
    const uploadResults = await Promise.all(
      images.map(async ({ imageUrl, metadata }) => {
        try {
          const imageBuffer = await getImageFromUrl(imageUrl);
          const bucket = getBucket(
            metadata.type || "restaurant",
            metadata.source || "google"
          );
          const fileName = `${Date.now()}-${decodedToken.uid}-${metadata.filename}`;

          const file = bucket.file(fileName);
          await file.save(imageBuffer, {
            resumable: false,
            contentType: metadata.contentType || "image/jpeg",
            metadata: {
              metadata: {
                userId: decodedToken.uid,
                ...metadata,
              },
            },
          });

          const fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

          // Save to cache (if applicable)
          await saveImageUrlCache(decodedToken.uid, fileName, fileUrl);

          return fileUrl;
        } catch (error) {
          console.error("Error processing image:", error);
          return null;
        }
      })
    );

    return NextResponse.json({ urls: uploadResults.filter(Boolean) });
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
