// app/api/storage/route.ts

import { NextRequest, NextResponse } from "next/server";
import admin from "@/config/firebaseAdmin";
import { DecodedIdToken } from "firebase-admin/auth";
import Busboy from "busboy";
import { saveImageUrlCache } from "@/app/services/firebaseFirestore";
import {
  restaurantImagesBucket,
  originalMenuBucket,
  processedMenuBucket,
  yelpMenuBucket,
} from "@/config/googleCloudConfig";

// Define the metadata interface
interface StorageMetadata {
  [key: string]: any; 
  restaurantId?: string;
  countyName?: string;
  townName?: string;
  filename: string;
  contentType: string;
  source: "google" | "yelp" | "user";
  type: "menu" | "restaurant" | "processed";
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
  const contentType = req.headers.get("content-type") || "";

  try {
    // Authentication
    const decodedToken = await verifyAuth(req);
    if (!decodedToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Handle JSON requests (for direct URL uploads)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { imageUrl, metadata } = body;

      if (!imageUrl || !metadata) {
        return NextResponse.json(
          { message: "Missing required fields" },
          { status: 400 }
        );
      }

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

        return NextResponse.json({ url: fileUrl }, { status: 200 });
      } catch (error) {
        console.error("Error processing image:", error);
        return NextResponse.json(
          { message: "Image processing failed", error: getErrorMessage(error) },
          { status: 500 }
        );
      }
    }

    // Handle multipart form-data
    if (contentType.includes("multipart/form-data")) {
      const headersObj: { [key: string]: string } = {};
      req.headers.forEach((value, key) => {
        headersObj[key.toLowerCase()] = value;
      });

      const bb = Busboy({ headers: headersObj });
      const fileWritePromises: Promise<void>[] = [];
      let fileUrl = "";
      let fileName = "";
      let metadata: StorageMetadata = {
        filename: "",
        contentType: "image/jpeg",
        source: "user",
        type: "restaurant",
      };

      bb.on(
        "file",
        (
          fieldname: string,
          file: NodeJS.ReadableStream,
          info: { filename: string; encoding: string; mimeType: string }
        ) => {
          const { filename, mimeType } = info;
          fileName = `${Date.now()}-${decodedToken.uid}-${filename}`;
          metadata.filename = filename;
          metadata.contentType = mimeType;

          const bucket = getBucket(metadata.type, metadata.source);
          const fileStream = bucket.file(fileName).createWriteStream({
            resumable: false,
            contentType: mimeType,
            metadata: {
              metadata: {
                userId: decodedToken.uid,
                ...metadata,
              },
            },
          });

          file.pipe(fileStream);

          fileWritePromises.push(
            new Promise((resolve, reject) => {
              fileStream.on("finish", () => {
                fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                resolve();
              });
              fileStream.on("error", reject);
            })
          );
        }
      );

      bb.on("field", (fieldname: string, val: string) => {
        // Collect additional metadata from form fields if needed
        if (fieldname in metadata) {
          (metadata[fieldname as keyof StorageMetadata] as any) = val;
        }
      });

      bb.on("finish", async () => {
        try {
          await Promise.all(fileWritePromises);
          if (!fileUrl) {
            return NextResponse.json(
              { message: "No file uploaded" },
              { status: 400 }
            );
          }

          // Save to cache (if applicable)
          await saveImageUrlCache(decodedToken.uid, fileName, fileUrl);

          return NextResponse.json({ url: fileUrl }, { status: 200 });
        } catch (error) {
          console.error("Error during file upload:", error);
          return NextResponse.json(
            {
              message: "File upload failed",
              error: getErrorMessage(error),
            },
            { status: 500 }
          );
        }
      });

      const reader = req.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bb.write(value);
        }
        bb.end();
      } else {
        return NextResponse.json(
          { message: "Failed to get reader from request body" },
          { status: 400 }
        );
      }
    }

    // If none of the above, return an error
    return NextResponse.json(
      { message: "Unsupported content type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
