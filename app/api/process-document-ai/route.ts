// app/api/process-document-ai/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { labeledBucket } from '@/config/googleCloudConfig';
import fetch from 'node-fetch';
import { saveDocumentAiResults } from '../../services/firebaseFirestore';
import { Menu } from '@/types/menuTypes';

const processorEndpoint = 'https://us-documentai.googleapis.com/v1/projects/500843166981/locations/us/processors/9a89a0ae110dcf9e:process';

interface DocumentAIResponse {
  document: any;
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, userId } = await req.json();
    if (!imageUrl || !userId) {
      return NextResponse.json({ message: 'Image URL and userId are required' }, { status: 400 });
    }

    console.log('Processing image:', imageUrl);

    const auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    console.log('Fetching image content...');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error('Failed to fetch image:', imageResponse.statusText);
      return NextResponse.json({ message: 'Failed to fetch image', status: imageResponse.status }, { status: imageResponse.status });
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    const requestPayload = {
      rawDocument: {
        content: imageBase64,
        mimeType: 'image/jpeg',
      },
    };

    console.log('Sending request to Document AI...');
    const response = await fetch(processorEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.token}`,
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Document AI processing failed:', error);
      return NextResponse.json({ message: 'Document AI processing failed', error }, { status: response.status });
    }

    const result = await response.json() as DocumentAIResponse;

    // Process the Document AI result and create a Menu object
    const menu: Menu = processDocumentAIResult(result.document);

    console.log('Saving result to labeled bucket...');
    const labeledFile = labeledBucket.file(`labeled_${new Date().toISOString()}.json`);
    await labeledFile.save(JSON.stringify(menu), {
      resumable: false,
    });

    const publicUrl = `https://storage.googleapis.com/${labeledBucket.name}/${labeledFile.name}`;

    console.log('Saving result to Firestore...');
    await saveDocumentAiResults(userId, imageUrl, menu);

    console.log('Processing completed successfully');
    return NextResponse.json({ menu, labeledUrl: publicUrl }, { status: 200 });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ message: 'Internal server error', error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

function processDocumentAIResult(document: any): Menu {
  // Implement the logic to convert Document AI result to Menu object
  // This is a placeholder implementation, adjust according to your Document AI output
  const menu: Menu = {
    items: document.entities.map((entity: any) => ({
      name: entity.mentionText,
      price: parseFloat(entity.properties.find((prop: any) => prop.type === 'price')?.mentionText || '0'),
      description: entity.properties.find((prop: any) => prop.type === 'description')?.mentionText,
    })),
  };
  return menu;
}