import { NextRequest, NextResponse } from 'next/server';
import { documentAiClient, labeledBucket } from '@/config/googleCloudConfig';
import fetch from 'node-fetch';

const processorEndpoint = 'https://us-documentai.googleapis.com/v1/projects/500843166981/locations/us/processors/9a89a0ae110dcf9e:process';

// Define the expected structure of the Document AI response
interface DocumentAIResponse {
  document: any; // Adjust this type based on the actual structure
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ message: 'Image URL is required' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get the content of the image from the URL
    const imageBuffer = await fetch(imageUrl).then((res) => res.arrayBuffer());

    // Convert the image buffer to a base64 encoded string
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');

    // Prepare the request payload for Document AI
    const requestPayload = {
      rawDocument: {
        content: imageBase64,
        mimeType: 'image/jpeg',
      },
    };

    // Make the prediction request to Document AI
    const response = await fetch(processorEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ message: 'Document AI processing failed', error }, { status: 500 });
    }

    const result = await response.json() as DocumentAIResponse;

    // Save the result to the labeled bucket
    const labeledFile = labeledBucket.file(`labeled_${new Date().toISOString()}.json`);
    await labeledFile.save(JSON.stringify(result.document), {
      resumable: false,
    });

    const publicUrl = `https://storage.googleapis.com/${labeledBucket.name}/${labeledFile.name}`;
    return NextResponse.json({ document: result.document, labeledUrl: publicUrl }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error', error }, { status: 500 });
  }
}
