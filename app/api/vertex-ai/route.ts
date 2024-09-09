// pages/api/vertex-ai.ts or app/api/vertex-ai/route.ts (depending on your Next.js setup)

import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';
import { saveVertexAiResults } from '@/app/services/firebaseFirestore';

// Initialize Vertex AI
const projectId = 'cemta-prototype-2';
const location = 'us-central1';
const modelId = 'gemini-1.5-pro-001';

// A retry mechanism for transient errors
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function retryableRequest(fn: () => Promise<any>) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === MAX_RETRIES - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, userId, menuName } = await req.json();

    if (!imageUrl || !userId || !menuName) {
      return NextResponse.json({ message: 'Image URL, userId, and menuName are required' }, { status: 400 });
    }

    // Setup the authentication for Google Cloud services
    const auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    // Convert the image URL to base64
    const imageBase64 = await getBase64(imageUrl);

    const vertexAI = new VertexAI({ project: projectId, location });

    // Create the generative vision model
    const generativeVisionModel = vertexAI.getGenerativeModel({ model: modelId });

    // Prepare the OCR request for Vertex AI
    const prompt = `Analyze the menu image and return a JSON structure with the following format, without any markdown formatting or explanations:
{
  "category1": [
    { "original": "Chinese text", "pinyin": "Pinyin", "english": "English translation", "price": "Price" },
    // More items...
  ],
  "category2": [
    // Items in this category...
  ]
  // More categories...
}`;

    const ocrRequest = {
      contents: [{
        role: 'user',
        parts: [{
          inlineData: {
            data: imageBase64,
            mimeType: 'image/png',
          }
        }, {
          text: prompt
        }]
      }]
    };

    // Send the OCR request to Vertex AI
        console.log("Sending request to Vertex AI...");
    const response = await generativeVisionModel.generateContent(ocrRequest);
    console.log("Received response from Vertex AI");
    console.log("Full Vertex AI response:", JSON.stringify(response, null, 2));

    const aggregatedResponse = await response.response;
    console.log("Aggregated response:", JSON.stringify(aggregatedResponse, null, 2));
    
    if (!aggregatedResponse || !aggregatedResponse.candidates || !aggregatedResponse.candidates[0]) {
      throw new Error("Vertex AI response is missing candidates.");
    }

    const candidateContent = aggregatedResponse.candidates[0].content;
    if (!candidateContent || !candidateContent.parts || candidateContent.parts.length === 0) {
      throw new Error("Vertex AI response is missing content parts.");
    }

    const textContent = candidateContent.parts[0].text;
    console.log("Raw text content from Vertex AI:", textContent);

    if (typeof textContent !== 'string') {
      throw new Error("Vertex AI response does not contain text content.");
    }

    // Aggressively strip any non-JSON content

    let jsonText = textContent.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1');
    console.log("Extracted JSON text:", jsonText);

    let menuData;
    try {
      menuData = JSON.parse(jsonText);
      console.log("Parsed menu data:", menuData);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return NextResponse.json({ 
        message: 'Failed to parse Vertex AI output as JSON',
        error: 'JSON parsing error',
        rawText: textContent,
        extractedJson: jsonText
      }, { status: 500 });
    }

    if (!menuData || Object.keys(menuData).length === 0) {
      console.warn("No menu data found in the parsed JSON.");
      return NextResponse.json({ 
        message: 'No menu data found in the parsed JSON',
        error: 'Empty menu data',
        rawText: textContent,
        extractedJson: jsonText,
        parsedData: menuData
      }, { status: 200 });
    }

    let processingId = await saveVertexAiResults(userId, JSON.stringify(menuData), menuName);

    return NextResponse.json({ 
      menuData, 
      processingId, 
      rawText: textContent,
      extractedJson: jsonText
    }, { status: 200 });
  } catch (error) {
    console.error('Error performing OCR with Vertex AI:', error);
    return NextResponse.json({ 
      message: 'Error performing OCR with Vertex AI', 
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// Utility function to convert image URL to base64
async function getBase64(url: string) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data).toString('base64');
}