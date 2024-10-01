// route.ts

import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';
import sharp from 'sharp';
import { saveVertexAiResults, getVertexAiResultsByRestaurant } from '@/app/services/firebaseFirestore';

// Initialize Vertex AI
const projectId = 'cemta-prototype-2';
const location = 'us-central1';
const modelId = 'gemini-1.5-pro-002';

// Constants
const MAX_OUTPUT_TOKENS = 8192;
const TOKEN_THRESHOLD = MAX_OUTPUT_TOKENS * 0.95; // 95% of max tokens

interface MenuItemPrice {
  regular?: string;
  small?: string;
  medium?: string;
  large?: string;
  xl?: string;
}

interface Upgrade {
  name: string;
  price: string;
}

interface MenuItem {
  name: {
    original: string;
    pinyin: string;
    english: string;
  };
  description: {
    original: string;
    english: string;
  };
  prices: MenuItemPrice;
  popular: boolean;
  chef_recommended: boolean;
  spice_level: string;
  allergy_alert: string;
  upgrades: Upgrade[];
  notes: string;
}

interface Category {
  name: {
    original: string;
    pinyin: string;
    english: string;
  };
  items: MenuItem[];
}

interface RestaurantInfo {
  name?: { original: string; english: string };
  address?: { original: string; english: string };
  operating_hours?: string;
  phone_number?: string;
  website?: string;
  social_media?: string;
  description?: { original: string; english: string };
  additional_notes?: string;
}

interface MenuData {
  restaurant_info: RestaurantInfo;
  categories: Category[];
  other_info: string;
}

// New function for exponential backoff
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      if (retries >= maxRetries || error?.status !== 429) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, retries);
      console.log(`Retrying after ${delay}ms...`);
      await wait(delay);
      retries++;
    }
  }
}

// Enhanced function to parse and fix JSON
function parseAndFixJSON(ocrText: string): MenuData {
  console.log('Raw OCR text:', ocrText);

  // Remove any markdown formatting or code block indicators
  ocrText = ocrText.replace(/```json\n?|\n?```/g, '').trim();

  // Attempt to fix common JSON errors
  let fixedText = ocrText;
  fixedText = fixedText.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  fixedText = fixedText.replace(/[\u0000-\u0019]+/g, '');

  try {
    const parsedData = JSON.parse(fixedText);
    if (!Array.isArray(parsedData.categories)) {
      parsedData.categories = [];
    }
    return parsedData;
  } catch (parseError) {
    console.error('Error parsing OCR text as JSON after fixing:', parseError);
    throw parseError;
  }
}

// Utility function to convert image URL to base64 with optimization
async function getBase64(url: string) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const optimizedImage = await sharp(response.data)
    .resize({ width: 2560 }) // Increased width for better quality
    .toFormat('png')
    .png({ quality: 80 }) // Adjust quality as needed
    .toBuffer();
  return optimizedImage.toString('base64');
}

// Function to split image into vertical chunks
async function splitImageIntoChunks(imageBuffer: Buffer, chunks: number): Promise<Buffer[]> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const { width, height } = metadata;

  if (!width || !height) throw new Error('Unable to retrieve image dimensions.');

  const chunkHeight = Math.floor(height / chunks);
  const chunkBuffers: Buffer[] = [];

  for (let i = 0; i < chunks; i++) {
    const top = i * chunkHeight;
    const extractHeight = i === chunks - 1 ? height - top : chunkHeight;

    if (extractHeight <= 0 || top + extractHeight > height) {
      console.warn(`Invalid extract dimensions for chunk ${i + 1}. Skipping this chunk.`);
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

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, userId, menuName, forceReprocess } = await req.json();

    if (!imageUrl || !userId || !menuName) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

   const existingMenuData = await getVertexAiResultsByRestaurant(userId, menuName);

    if (existingMenuData && !forceReprocess) {
      console.log('Existing menu data found. Returning cached data.');
      return NextResponse.json(
        {
          ocrText: existingMenuData.menuData,
          processingId: existingMenuData.processingId,
          cached: true,
          timestamp: existingMenuData.timestamp,
        },
        { status: 200 }
      );
    }


    // Setup authentication for Google Cloud services
    const auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    await client.getAccessToken();

    // Convert the image URL to optimized base64
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data);
    const imageBase64 = await getBase64(imageUrl);

    const vertexAI = new VertexAI({ project: projectId, location });
    const generativeVisionModel = vertexAI.getGenerativeModel({ model: modelId });

    // Prepare the OCR request for Vertex AI
    const basePrompt = `Analyze the entire menu image carefully and output a complete JSON structure with the following format:

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

Important Instructions:
- Ensure you capture ALL menu items and categories visible in the image.
- Provide accurate and complete information for each field.
- Include 'pinyin' transliterations for all Chinese names.
- If a specific field is not applicable or information is not available, use an empty string or appropriate default value.
- Ensure the output is in valid JSON format without any extra text or explanations.
- Do not truncate or summarize the menu items. Include every item you can see in the image.`;

   let apiCallCount = 1;
    let combinedParsedOcrText: MenuData = {
      restaurant_info: {} as RestaurantInfo,
      categories: [],
      other_info: '',
    };

    // Initial API call with retry
    const ocrRequest = {
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: imageBase64, mimeType: 'image/png' } },
            { text: basePrompt },
          ],
        },
      ],
      parameters: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.2,
      },
    };

    const response = await retryWithExponentialBackoff(async () => {
      const res = await generativeVisionModel.generateContent(ocrRequest);
      return res.response;
    });

    if (!response?.candidates?.[0]) {
      throw new Error('Vertex AI response is missing candidates.');
    }

    let ocrText = response.candidates[0].content.parts[0].text;

    if (!ocrText) {
      throw new Error('OCR text is undefined or could not be extracted.');
    }

    console.log('Initial OCR text:', ocrText);

    // Parse initial response
    try {
      combinedParsedOcrText = parseAndFixJSON(ocrText);
    } catch (error) {
      console.error('Error parsing initial OCR text:', error);
      throw error;
    }

    // Check if additional API calls are needed
    if (ocrText.length >= TOKEN_THRESHOLD) {
      console.log('Making additional API calls for complete menu coverage.');

      const totalChunks = 3; // Adjust as needed
      const chunkBuffers = await splitImageIntoChunks(imageBuffer, totalChunks);

      const chunkPromises = chunkBuffers.map(async (chunkBuffer, i) => {
        const chunkBase64 = (await sharp(chunkBuffer).toBuffer()).toString('base64');

        const chunkPrompt = `Analyze this part (${i + 1}/${totalChunks}) of the menu image and output a JSON structure as previously specified. Focus on capturing ALL menu items in this section.

${basePrompt}

Ensure you don't miss any items or categories visible in this part of the image.`;

        const chunkOcrRequest = {
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { data: chunkBase64, mimeType: 'image/png' } },
                { text: chunkPrompt },
              ],
            },
          ],
          parameters: {
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.2,
          },
        };

        return retryWithExponentialBackoff(async () => {
          const chunkResponse = await generativeVisionModel.generateContent(chunkOcrRequest);
          const chunkAggregatedResponse = await chunkResponse.response;

          if (!chunkAggregatedResponse?.candidates?.[0]) {
            console.error(`Vertex AI response is missing candidates for chunk ${i + 1}.`);
            return null;
          }

          let chunkOcrText = chunkAggregatedResponse.candidates[0].content.parts[0].text;

          if (!chunkOcrText) {
            console.error(`OCR text is undefined for chunk ${i + 1}.`);
            return null;
          }

          try {
            return parseAndFixJSON(chunkOcrText);
          } catch (error) {
            console.error(`Error parsing OCR text for chunk ${i + 1}:`, error);
            return null;
          }
        });
      });

      const chunkResults = await Promise.all(chunkPromises);
      apiCallCount += chunkResults.length;

      // Combine results
      chunkResults.forEach((result, index) => {
        if (result) {
          if (index === 0) {
            // Update restaurant info if first chunk has more complete information
            combinedParsedOcrText.restaurant_info = {
              ...combinedParsedOcrText.restaurant_info,
              ...result.restaurant_info,
            };
          }
          combinedParsedOcrText.categories = combinedParsedOcrText.categories.concat(
            result.categories || []
          );
          combinedParsedOcrText.other_info += ' ' + (result.other_info || '');
        }
      });

      // Remove duplicate categories and merge items
      const uniqueCategoriesMap = new Map<string, Category>();
      combinedParsedOcrText.categories.forEach((category: Category) => {
        const key = category.name.original;
        if (uniqueCategoriesMap.has(key)) {
          const existingCategory = uniqueCategoriesMap.get(key)!;
          existingCategory.items = existingCategory.items.concat(category.items || []);
        } else {
          uniqueCategoriesMap.set(key, category);
        }
      });
      combinedParsedOcrText.categories = Array.from(uniqueCategoriesMap.values());
    }

   // Save the results and get the processing ID
    let processingId;
    try {
      const restaurantName =
        combinedParsedOcrText.restaurant_info?.name?.original || menuName;
      processingId = await saveVertexAiResults(
        userId,
        combinedParsedOcrText,
        menuName,
        restaurantName
      );
    } catch (saveError) {
      console.error('Error saving Vertex AI results:', saveError);
      return NextResponse.json(
        {
          message: 'Error saving Vertex AI results',
          error:
            saveError instanceof Error ? saveError.message : String(saveError),
        },
        { status: 500 }
      );
    }

    console.log(`Processed menu with ${apiCallCount} API calls to Vertex AI.`);

    return NextResponse.json(
      {
        ocrText: combinedParsedOcrText,
        processingId,
        apiCallCount,
        cached: false,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error performing OCR with Vertex AI:', error);
    let errorMessage = 'Error performing OCR with Vertex AI';
    if (error instanceof Error) {
      errorMessage += ': ' + error.message;
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { message: errorMessage, error: String(error) },
      { status: 500 }
    );
  }
}