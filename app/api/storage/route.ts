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
  yelpMenuBucket 
} from "@/config/googleCloudConfig";


interface StorageMetadata {
  userId?: string;
  restaurantId?: string;
  countyName?: string;
  townName?: string;
  filename: string;
  contentType: string;
  source: 'google' | 'yelp' | 'user';
  type: 'menu' | 'restaurant' | 'processed';
}

interface BatchImageUploadRequest {
  images: Array<{
    imageUrl: string;
    metadata: StorageMetadata;
  }>;
}

// Add token cache
const tokenCache = new Map<string, {
  decodedToken: DecodedIdToken;
  expires: number;
}>();

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

    // Check cache first
    const cached = tokenCache.get(token);
    if (cached && Date.now() < cached.expires) {
      return cached.decodedToken;
    }

    // Verify token if not in cache
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Cache the decoded token
    tokenCache.set(token, {
      decodedToken,
      expires: Date.now() + (5 * 60 * 1000) // Cache for 5 minutes
    });

    // Clean up expired tokens
    for (const [key, value] of tokenCache.entries()) {
      if (Date.now() > value.expires) {
        tokenCache.delete(key);
      }
    }

    return decodedToken;
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
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
    console.error('Error fetching image:', error);
    throw new Error('Failed to fetch image from URL');
  }
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  return new Promise<NextResponse>(async (resolve, reject) => {
    try {
      // Authentication
      const authHeader = req.headers.get("authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.error("Missing or invalid authorization header");
        return resolve(
          NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
        );
      }

      const token = authHeader.split("Bearer ")[1];
      let decodedToken: DecodedIdToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(token);
        console.log("Token verified:", decodedToken);
      } catch (error) {
        console.error("Error verifying Firebase ID token:", error);
        return resolve(
          NextResponse.json(
            { message: "Invalid token", error: getErrorMessage(error) },
            { status: 401 },
          ),
        );
      }

      // Handle JSON requests (for direct URL uploads)
      if (contentType.includes("application/json")) {
        const body = await req.json();
        const { imageUrl, metadata } = body;

        if (!imageUrl || !metadata) {
          return resolve(
            NextResponse.json(
              { message: "Missing required fields" },
              { status: 400 }
            )
          );
        }

        try {
          const imageBuffer = await getImageFromUrl(imageUrl);
          const bucket = getBucket(metadata.type || 'restaurant', metadata.source || 'google');
          const fileName = `${Date.now()}-${decodedToken.uid}-${metadata.filename}`;
          
          const file = bucket.file(fileName);
          await file.save(imageBuffer, {
            resumable: false,
            contentType: 'image/jpeg',
            metadata: {
              metadata: {
                userId: decodedToken.uid,
                ...metadata
              }
            }
          });

          const fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          
          // Save to cache
          await saveImageUrlCache(decodedToken.uid, fileName, fileUrl);
          
          resolve(NextResponse.json({ url: fileUrl }, { status: 200 }));
        } catch (error) {
          console.error('Error processing image:', error);
          resolve(NextResponse.json(
            { message: "Image processing failed", error: getErrorMessage(error) },
            { status: 500 }
          ));
        }
      }

        if (req.url.endsWith('/batch')) {
    const { images } = (await req.json()) as BatchImageUploadRequest;
    const uploadResults = await Promise.all(
      images.map(async ({ imageUrl, metadata }) => {
        try {
          const imageBuffer = await getImageFromUrl(imageUrl);
          const bucket = getBucket(metadata.type || 'restaurant', metadata.source || 'google');
          const fileName = `${Date.now()}-${decodedToken.uid}-${metadata.filename}`;
          
          const file = bucket.file(fileName);
          await file.save(imageBuffer, {
            resumable: false,
            contentType: 'image/jpeg',
            metadata: {
              metadata: {
                userId: decodedToken.uid,
                ...metadata
              }
            }
          });

          return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        } catch (error) {
          console.error('Error processing image:', error);
          return null;
        }
      })
    );

    return NextResponse.json({ urls: uploadResults.filter(Boolean) });
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

        bb.on(
          "file",
          (
            fieldname: string,
            file: NodeJS.ReadableStream,
            info: { filename: string; encoding: string; mimeType: string },
          ) => {
            const { filename, mimeType } = info;
            fileName = `${Date.now()}-${decodedToken.uid}-${filename}`;
            const bucket = getBucket('restaurant', 'user');
            const fileStream = bucket
              .file(fileName)
              .createWriteStream({
                resumable: false,
                contentType: mimeType,
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

        bb.on("finish", async () => {
          try {
            await Promise.all(fileWritePromises);
            if (!fileUrl) {
              return resolve(
                NextResponse.json(
                  { message: "No file uploaded" },
                  { status: 400 }
                )
              );
            }

            // Save to cache
            await saveImageUrlCache(decodedToken.uid, fileName, fileUrl);

            resolve(NextResponse.json({ url: fileUrl }, { status: 200 }));
          } catch (error) {
            console.error("Error during file upload:", error);
            resolve(
              NextResponse.json(
                { message: "File upload failed", error: getErrorMessage(error) },
                { status: 500 }
              )
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
          resolve(
            NextResponse.json(
              { message: "Failed to get reader from request body" },
              { status: 400 }
            )
          );
        }
      }
    } catch (error) {
      console.error("Internal server error:", error);
      resolve(
        NextResponse.json(
          { message: "Internal server error", error: getErrorMessage(error) },
          { status: 500 }
        )
      );
    }
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function getBucket(type: StorageMetadata['type'], source: StorageMetadata['source']) {
  switch (type) {
    case 'menu':
      return source === 'yelp' ? yelpMenuBucket : originalMenuBucket;
    case 'processed':
      return processedMenuBucket;
    case 'restaurant':
    default:
      return restaurantImagesBucket;
  }
}