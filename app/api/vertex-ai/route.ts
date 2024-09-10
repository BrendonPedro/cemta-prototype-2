// app/api/vertex-ai/route.ts 

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

    if (!imageUrl) {
      return NextResponse.json({ message: 'Image URL is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }
    if (!menuName) {
      return NextResponse.json({ message: 'Menu name is required' }, { status: 400 });
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
    const ocrRequest = {
      contents: [{
        role: 'user',
        parts: [{
          inlineData: {
            data: imageBase64,
            mimeType: 'image/png',
          }
        }, {
          text: `Read the menu image attached and place the content into a table with 4 columns: Original, Price, Pinyin, English. Format the output as a pipe-separated table, with each row on a new line.`
        }]
      }]
    };

    // Send the OCR request to Vertex AI
    const response = await generativeVisionModel.generateContent(ocrRequest);
    const aggregatedResponse = await response.response;
    
    if (!aggregatedResponse || !aggregatedResponse.candidates || !aggregatedResponse.candidates[0]) {
      throw new Error("Vertex AI response is missing candidates.");
    }

    const ocrText = aggregatedResponse.candidates[0].content.parts[0].text;

    if (!ocrText) {
      throw new Error('OCR text is undefined or could not be extracted.');
    }


    // Save the results and get the processing ID
    let processingId;
    try {
      processingId = await saveVertexAiResults(userId, ocrText, menuName);
    } catch (saveError) {
      console.error('Error saving Vertex AI results:', saveError);
      return NextResponse.json({ message: 'Error saving Vertex AI results', error: saveError instanceof Error ? saveError.message : String(saveError) }, { status: 500 });
    }

    return NextResponse.json({ ocrText, processingId }, { status: 200 });
  } catch (error) {
    console.error('Error performing OCR with Vertex AI:', error);
    return NextResponse.json({ message: 'Error performing OCR with Vertex AI', error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// Utility function to convert image URL to base64
async function getBase64(url: string) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data).toString('base64');
}