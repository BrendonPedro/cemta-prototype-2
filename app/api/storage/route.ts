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

// Keep your existing interfaces and helper functions
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

function getBucket(
  type: StorageMetadata["type"],
  source: StorageMetadata["source"]
) {
  const bucket = (() => {
    switch (type) {
      case "menu":
        return source === "yelp" ? yelpMenuBucket : originalMenuBucket;
      case "processed":
        return processedMenuBucket;
      case "restaurant":
      default:
        return restaurantImagesBucket;
    }
  })();

  if (!bucket) {
    throw new Error(`Bucket not initialized for type: ${type} and source: ${source}`);
  }

  return bucket;
}

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

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

    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  console.log("Storage API route hit");
  const contentType = req.headers.get("content-type") || "";
  console.log("Content-Type:", contentType);

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

    // Handle multipart form-data with improved error handling
    if (contentType.includes("multipart/form-data")) {
      return new Promise((resolve, reject) => {
        const headersObj: { [key: string]: string } = {};
        req.headers.forEach((value, key) => {
          headersObj[key.toLowerCase()] = value;
        });

        console.log("Processing multipart form-data with headers:", headersObj);

        const bb = Busboy({ 
          headers: headersObj,
          limits: {
            files: 1,
            fileSize: 10 * 1024 * 1024, // 10MB limit
          }
        });

        const fileWritePromises: Promise<void>[] = [];
        let fileUrl = "";
        let fileName = "";
        let metadata: StorageMetadata = {
          filename: "",
          contentType: "image/jpeg",
          source: "user",
          type: "menu", // Changed default to menu
        };

        bb.on("file", (fieldname, file, info) => {
          console.log("Processing file:", info.filename);
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
            new Promise((resolveFile, rejectFile) => {
              fileStream.on("finish", () => {
                fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                console.log("File uploaded successfully:", fileUrl);
                resolveFile();
              });

              fileStream.on("error", (error) => {
                console.error("File stream error:", error);
                rejectFile(error);
              });

              file.on("error", (error) => {
                console.error("File read error:", error);
                rejectFile(error);
              });
            })
          );
        });

        bb.on("field", (fieldname: string, val: string) => {
          console.log("Received field:", fieldname, val);
          try {
            if (fieldname === 'metadata') {
              const parsedMetadata = JSON.parse(val);
              metadata = { ...metadata, ...parsedMetadata };
              console.log("Parsed metadata:", metadata);
            }
          } catch (error) {
            console.error("Error parsing field:", error);
          }
        });

        bb.on("finish", async () => {
          try {
            await Promise.all(fileWritePromises);
            if (!fileUrl) {
              console.error("No file URL generated");
              resolve(NextResponse.json(
                { message: "No file uploaded" },
                { status: 400 }
              ));
              return;
            }

            await saveImageUrlCache(decodedToken.uid, fileName, fileUrl);
            console.log("File processed successfully");
            resolve(NextResponse.json({ url: fileUrl }, { status: 200 }));
          } catch (error) {
            console.error("Error in finish event:", error);
            resolve(NextResponse.json(
              {
                message: "File upload failed",
                error: getErrorMessage(error),
              },
              { status: 500 }
            ));
          }
        });

        bb.on("error", (error) => {
          console.error("Busboy error:", error);
          resolve(NextResponse.json(
            { message: "File processing error", error: getErrorMessage(error) },
            { status: 500 }
          ));
        });

        // Process the request body
        const reader = req.body?.getReader();
        if (!reader) {
          console.error("No request body reader available");
          resolve(NextResponse.json(
            { message: "Failed to get reader from request body" },
            { status: 400 }
          ));
          return;
        }

        (async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              bb.write(value);
            }
            bb.end();
          } catch (error) {
            console.error("Error reading request body:", error);
            resolve(NextResponse.json(
              { message: "Error reading request body", error: getErrorMessage(error) },
              { status: 400 }
            ));
          }
        })();
      });
    }

    console.error("Unsupported content type:", contentType);
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