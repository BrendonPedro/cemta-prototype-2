// app/api/vertex-ai/route.ts

import { NextRequest, NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";
import { GoogleAuth } from "google-auth-library";
import axios from "axios";
import sharp from "sharp";
import {
  getVertexAiResultsByRestaurant,
  getCachedImageUrl,
  saveImageUrlCache,
} from "@/app/services/firebaseFirestore";
import { saveVertexAiResults } from "@/app/services/firebaseFirestore.server";
import { jsonrepair } from "jsonrepair";
import vision from "@google-cloud/vision";
import pLimit from "p-limit";
import { setTimeout } from "timers/promises";
import {
  storage,
  originalMenuBucket,
  processedMenuBucket,
  assertStorage,
  assertBucket
} from "@/config/googleCloudConfig";
import type { VertexAiResult } from "@/app/services/restaurant/types";
import type { MenuItem, Category, MenuData } from '@/app/services/menu/types';

// Queue system
const queue: (() => Promise<any>)[] = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  while (queue.length > 0) {
    const task = queue.shift();
    if (task) {
      try {
        await task();
      } catch (error) {
        console.error("Error processing task:", error);
      }
      await setTimeout(1000);
    }
  }

  isProcessing = false;
}

function addToQueue(task: () => Promise<any>) {
  queue.push(task);
  processQueue();
}

// Initialize Vertex AI
const projectId = "cemta4";
const location = "us-central1";
const modelId = "gemini-2.0-flash-001";

// Constants
const MAX_OUTPUT_TOKENS = 8192;
const MAX_RETRIES = 3;

// Interface definitions
interface RequestBody {
  imageUrl: string;
  userId: string;
  menuName: string;
  restaurantId: string;
  forceReprocess?: boolean;
  menuId?: string;
  yelpId?: string;
}

interface SaveData {
  userId: string;
  menuData: any;
  menuId: string;
  restaurantId: string;
  menuName: string;
  imageUrl: string;
  restaurantName: string;
  yelpId?: string;
}

// Helper function for error handling
function getErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

// Initialize Vision API client
const visionClient = new vision.ImageAnnotatorClient();

// Concurrency limit
const limit = pLimit(4);

// Declare apiCallCount at the module level
let apiCallCount = 0;

// Utility functions for image download
async function downloadImageFromGCS(imageUrl: string): Promise<Buffer> {
  assertStorage(storage);
  
  let bucketName: string;
  let fileName: string;

  if (imageUrl.startsWith("gs://")) {
    // Handle gs:// URLs
    bucketName = imageUrl.split("/")[2];
    fileName = imageUrl.split("/").slice(3).join("/");
  } else if (imageUrl.startsWith("https://storage.googleapis.com")) {
    // Handle storage.googleapis.com URLs
    const parsedUrl = new URL(imageUrl);
    bucketName = parsedUrl.pathname.split("/")[1];
    fileName = decodeURIComponent(parsedUrl.pathname.split("/").slice(2).join("/"));
  } else {
    throw new Error("Invalid GCS URL format");
  }

  const bucket = storage.bucket(bucketName);
  assertBucket(bucket);
  
  const file = bucket.file(fileName);
  const [buffer] = await file.download();
  return buffer;
}

async function downloadImageFromUrl(url: string): Promise<Buffer> {
  try {
    // Check if the URL is relative (starts with /)
    if (url.startsWith('/')) {
      // Convert to absolute URL using your domain
      url = `${process.env.NEXT_PUBLIC_APP_URL}${url}`;
      // Or use a default image if this is a placeholder
      if (url.includes('placeholder')) {
        url = `${process.env.NEXT_PUBLIC_APP_URL}/images/placeholder-restaurant.jpg`;
      }
    }

    console.log('Downloading image from:', url);
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      validateStatus: (status) => status === 200,
    });

    return Buffer.from(response.data, 'binary');
  } catch (error) {
    console.error('Error downloading image:', error);
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to download image: ${error.message}`);
    }
    throw error;
  }
}

// Helper functions
async function splitImageIntoChunks(
  imageBuffer: Buffer,
  chunks: number,
): Promise<Buffer[]> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  if (!width || !height) {
    throw new Error("Unable to retrieve image dimensions.");
  }

  const chunkHeight = Math.ceil(height / chunks);
  const chunkBuffers: Buffer[] = [];

  for (let i = 0; i < chunks; i++) {
    const top = i * chunkHeight;
    const extractHeight = i === chunks - 1 ? height - top : chunkHeight;

    if (extractHeight <= 0 || top + extractHeight > height) {
      console.warn(
        `Invalid extract dimensions for chunk ${i + 1}. Skipping this chunk.`,
      );
      continue;
    }

    const chunkBuffer = await image
      .clone()
      .extract({ left: 0, top, width, height: extractHeight })
      .toBuffer();

    chunkBuffers.push(chunkBuffer);
  }

  return chunkBuffers;
}

async function detectChiliIcons(imageChunkBuffer: Buffer): Promise<number> {
  if (!visionClient || !visionClient.objectLocalization) {
    throw new Error("Vision client or objectLocalization method is undefined");
  }

  const [result] = await visionClient.objectLocalization({
    image: { content: imageChunkBuffer.toString("base64") },
  });
  const objects = result.localizedObjectAnnotations || [];

  const chiliObjects = objects.filter(
    (object) =>
      object.name?.toLowerCase().includes("chili") ||
      object.name?.toLowerCase().includes("pepper"),
  );

  return chiliObjects.length;
}

async function processImageChunks(
  imageChunkBuffers: Buffer[],
  generativeModel: any,
  basePrompt: string,
): Promise<any> {
  const imageChunkBase64 = imageChunkBuffers[0].toString("base64");

  const request = {
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: imageChunkBase64,
              mimeType: "image/png",
            },
          },
          { text: basePrompt },
        ],
      },
    ],
    parameters: {
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.2,
    },
  };

  const response = await generativeModel.generateContent(request);
  const candidate = response.response?.candidates?.[0];

  if (!candidate) {
    throw new Error("Vertex AI did not return any candidates.");
  }

  const contentParts = candidate.content?.parts;

  if (!contentParts || contentParts.length === 0) {
    throw new Error("No content parts returned by Vertex AI.");
  }

  const firstPart = contentParts[0];

  if (!firstPart || !firstPart.text) {
    throw new Error("Model output is undefined.");
  }

  const modelOutput: string = firstPart.text;

  console.log("Model Output:", modelOutput);

  function extractJSON(text: string): string {
    const jsonRegex = /{[\s\S]*}/;
    const match = text.match(jsonRegex);
    if (match) {
      return match[0];
    } else {
      throw new Error("No JSON content found in the model output.");
    }
  }

  const jsonText = extractJSON(modelOutput);

  let menuData;
  try {
    const repairedJSON = jsonrepair(jsonText);
    menuData = JSON.parse(repairedJSON);
  } catch (error) {
    console.error("Error repairing JSON:", error);
    throw new Error("Failed to parse JSON from model output.");
  }

  const spiceLevel = await detectChiliIcons(imageChunkBuffers[0]);

  for (const category of menuData.categories) {
    for (const item of category.items) {
      if (!item.spice_level) {
        item.spice_level = spiceLevel.toString();
      }
    }
  }

  return menuData;
}

async function processImageChunksWithRetry(
  imageChunkBuffers: Buffer[],
  generativeModel: any,
  basePrompt: string,
  maxRetries = MAX_RETRIES,
): Promise<any> {
  let attempt = 0;
  const baseDelay = 1000;

  while (attempt < maxRetries) {
    try {
      apiCallCount++;
      return await processImageChunks(
        imageChunkBuffers,
        generativeModel,
        basePrompt,
      );
    } catch (error: any) {
      console.error(`Error in attempt ${attempt + 1}:`, error);
      if (
        error.message.includes("429") ||
        error.message.includes("RESOURCE_EXHAUSTED") ||
        error.message.includes("rate limit")
      ) {
        attempt++;
        const jitter = Math.random() * 0.3 - 0.15;
        const delay = baseDelay * Math.pow(2, attempt - 1) * (1 + jitter);
        console.warn(
          `Attempt ${attempt} failed due to rate limiting. Retrying after ${delay.toFixed(2)} ms...`,
        );
        await setTimeout(delay);
      } else {
        throw error;
      }
    }
  }

  throw new Error(
    `Failed to process image chunks after ${maxRetries} attempts.`,
  );
}

function mergeCategories(categories: any[]): any[] {
  const categoryMap = new Map<string, any>();

  for (const category of categories) {
    const key = category.name.original || "Unnamed Category";

    if (categoryMap.has(key)) {
      const existingCategory = categoryMap.get(key);
      existingCategory.items.push(...category.items);
    } else {
      categoryMap.set(key, { ...category });
    }
  }

  return Array.from(categoryMap.values());
}

// Main POST function
export async function POST(req: NextRequest) {
  try {
    const reqBody: RequestBody = await req.json();
    const { imageUrl, userId, menuName, menuId, restaurantId, forceReprocess } = reqBody;

    if (!imageUrl || !userId || !menuName || !menuId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check for cached results
    const cachedImageUrl = await getCachedImageUrl(userId, menuName);
    if (cachedImageUrl && !forceReprocess) {
      const existingMenuData = await getVertexAiResultsByRestaurant(
        userId,
        menuName,
      );
      if (existingMenuData) {
        console.log("Existing menu data found. Returning cached data.");
        return NextResponse.json(
          {
            menuData: existingMenuData.menuData,
            processingId: existingMenuData.id,
            apiCallCount: 0,
            cached: true,
            timestamp: existingMenuData.timestamp,
          },
          { status: 200 },
        );
      }
    }

    return new Promise((resolve) => {
      addToQueue(async () => {
        try {
          // Initialize Google Auth
          const auth = new GoogleAuth({
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            scopes: ["https://www.googleapis.com/auth/cloud-platform"],
          });
          const client = await auth.getClient();
          await client.getAccessToken();

          // Download and process image
          let imageBuffer: Buffer;
          try {
            if (imageUrl.startsWith("gs://") || imageUrl.startsWith("https://storage.googleapis.com")) {
              imageBuffer = await downloadImageFromGCS(imageUrl);
            } else {
              imageBuffer = await downloadImageFromUrl(imageUrl);
            }

            // Optimize image
            const optimizedImageBuffer = await sharp(imageBuffer)
              .resize({ width: 2560 })
              .toFormat("png")
              .png({ quality: 80 })
              .toBuffer();

            // Save processed image
            assertBucket(processedMenuBucket);
            const processedFileName = `${userId}/${menuName}_processed.png`;
            const processedFile = processedMenuBucket.file(processedFileName);
            await processedFile.save(optimizedImageBuffer, {
              metadata: { contentType: "image/png" },
            });
            const processedImageUrl = `gs://${processedMenuBucket.name}/${processedFileName}`;

            // Initialize Vertex AI
            const vertexAI = new VertexAI({ project: projectId, location });
            const generativeModel = vertexAI.getGenerativeModel({
              model: modelId,
            });

            // Base prompt
            const basePrompt = `You are an AI assistant that extracts data from menu images and outputs JSON. Analyze the menu image provided and output only the JSON representation of the menu in the specified format, without any explanations, code snippets, or additional text. Ensure you capture all details, including prices, descriptions, and categories.

JSON Format:
{
  "restaurant_info": {
    "name": {"original": "", "english": ""},
    "address": {"original": "", "english": ""},
    "operating_hours": "",
    "phone_number": "",
    "website": "",
    "social_media": "",
    "description": {"original": "", "english": ""},
    "additional_notes": ""
  },
  "categories": [
    {
      "name": {"original": "", "pinyin": "", "english": ""},
      "items": [
        {
          "name": {
            "original": "",
            "pinyin": "",
            "english": ""
          },
          "description": {
            "original": "",
            "english": ""
          },
          "prices": {
            "regular": "",
            "small": "",
            "medium": "",
            "large": "",
            "xl": ""
          },
          "popular": false,
          "chef_recommended": false,
          "spice_level": "",
          "allergy_alert": "",
          "upgrades": [
            {
              "name": "",
              "price": ""
            }
          ],
          "notes": ""
        }
      ]
    }
  ],
  "other_info": ""
}

Instructions:
- **Output only the JSON object in the specified format. Do not include any explanations or extra text.**
- Analyze the entire menu image carefully and capture all menu items, categories, and details.
- Provide accurate and complete information for each field, including all available prices.
- Include 'pinyin' transliterations for all Chinese names.
- **Pay special attention to visual indicators such as chili icons that represent the level of spiciness and map them to the 'spice_level' field (e.g., '1', '2', '3').**
- If a specific field is not applicable or information is not available, use an empty string or appropriate default value. Do not include null values.
- Ensure the output is in valid JSON format.

Now, analyze the following image and output the JSON accordingly, capturing as much detail as possible.
`;

            apiCallCount = 0;

            let combinedMenuData: any = {
              restaurant_info: {
                name: { original: "", english: "" },
                address: { original: "", english: "" },
                operating_hours: "",
                phone_number: "",
                website: "",
                social_media: "",
                description: { original: "", english: "" },
                additional_notes: "",
              },
              categories: [],
              other_info: "",
            };

            const totalChunks = 3;
            const chunkBuffers = await splitImageIntoChunks(
              optimizedImageBuffer,
              totalChunks,
            );

            const chunkPromises = chunkBuffers.map((chunkBuffer) =>
              limit(() =>
                processImageChunksWithRetry(
                  [chunkBuffer],
                  generativeModel,
                  basePrompt,
                ),
              ),
            );

            console.log(`Processing ${chunkBuffers.length} chunks...`);

            const chunkMenuDataArray = await Promise.all(chunkPromises);

            console.log(
              `Processed ${chunkMenuDataArray.length} chunks successfully.`,
            );

            for (const chunkMenuData of chunkMenuDataArray) {
              combinedMenuData.restaurant_info = {
                ...combinedMenuData.restaurant_info,
                ...chunkMenuData.restaurant_info,
              };
              combinedMenuData.categories.push(
                ...(chunkMenuData.categories || []),
              );
              combinedMenuData.other_info +=
                " " + (chunkMenuData.other_info || "");
            }

            combinedMenuData.categories = mergeCategories(
              combinedMenuData.categories,
            );

            const restaurantName: string =
              combinedMenuData.restaurant_info?.name?.original ||
              menuName ||
              "Unknown Restaurant";

            console.log("Processing menuId:", menuId);

            const cleanedMenuData = {
              ...combinedMenuData,
              categories: combinedMenuData.categories || [],
              items: [], // Initialize empty items array
              restaurant_info: {
                ...combinedMenuData.restaurant_info,
                name: {
                  original: restaurantName || menuName || "Unknown Restaurant",
                  english: combinedMenuData.restaurant_info?.name?.english || ""
                }
              }
            };

            // Process uncategorized items
            const uncategorizedItems: MenuItem[] = [];
            if (Array.isArray(combinedMenuData.categories)) {
              combinedMenuData.categories.forEach((category: any) => {
                if (!category.name || typeof category.name === 'string') {
                  // If category doesn't have proper name structure, its items are uncategorized
                  if (Array.isArray(category.items)) {
                    uncategorizedItems.push(...(category.items as MenuItem[]));
                  } else if ('price' in category) {
                    // The category itself might be an item
                    uncategorizedItems.push(category as MenuItem);
                  }
                }
              });
            }

            // Add uncategorized items to the root items array
            if (uncategorizedItems.length > 0) {
              cleanedMenuData.items = uncategorizedItems;
            }

            // Ensure categories are properly structured
            cleanedMenuData.categories = cleanedMenuData.categories
              .filter((category: any) => category.name && typeof category.name === 'object')
              .map((category: any): Category => ({
                name: {
                  original: typeof category.name === 'string' ? category.name : category.name.original,
                  english: typeof category.name === 'string' ? category.name : (category.name.english || ''),
                  pinyin: typeof category.name === 'string' ? '' : (category.name.pinyin || '')
                },
                items: Array.isArray(category.items) ? category.items as MenuItem[] : []
              }));

            const saveData: SaveData = {
              userId,
              menuData: cleanedMenuData,
              menuId,
              restaurantId,
              menuName,
              imageUrl,
              restaurantName: restaurantName || menuName || "Unknown Restaurant",
            };

            console.log("Saving menu data:", {
              menuId,
              restaurantId,
              menuName,
              restaurantName,
              yelpId: saveData.yelpId
            });

            const processingId = await saveVertexAiResults(
              saveData.userId,
              saveData.menuData,
              saveData.menuId,
              saveData.restaurantId,
              saveData.menuName,
              saveData.imageUrl,
              saveData.restaurantName
            );

            await saveImageUrlCache(userId, menuName, processedImageUrl);
            console.log("Successfully saved menu data with ID:", processingId);

            const result: VertexAiResult = {
              menuData: cleanedMenuData,
              processingId: menuId,
              timestamp: new Date().toISOString(),
              restaurantId,
              restaurantName,
              imageUrl,
              restaurantValidated: false,
              validatorValidated: false
            };

            resolve(
              NextResponse.json(result)
            );
          } catch (error: any) {
            console.error("Error in Vertex AI processing:", error);
            let errorMessage = "An error occurred during processing";
            if (error.response) {
              errorMessage += `: ${error.response.status} ${error.response.statusText}`;
              console.error("Error response data:", error.response.data);
            }
            resolve(NextResponse.json({ error: errorMessage }, { status: 500 }));
          }
        } catch (error: any) {
          console.error("Error in queue processing:", error);
          resolve(
            NextResponse.json(
              { error: "An error occurred during queue processing" },
              { status: 500 }
            )
          );
        }
      });
    });
  } catch (error: any) {
    console.error("Error in API route:", error);
    return NextResponse.json(
      { error: "An error occurred in the API route" },
      { status: 500 }
    );
  }
}