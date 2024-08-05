// // /app/api/process-document-ai/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { documentAiClient, labeledBucket } from '@/config/googleCloudConfig';
// import admin from '@/config/firebaseAdmin';
// import fetch from 'node-fetch';

// const processorEndpoint = 'https://us-documentai.googleapis.com/v1/projects/500843166981/locations/us/processors/9a89a0ae110dcf9e:process';

// export async function POST(req: NextRequest) {
//   try {
//     const { imageUrl } = await req.json();
//     if (!imageUrl) {
//       return NextResponse.json({ message: 'Image URL is required' }, { status: 400 });
//     }

//     const authHeader = req.headers.get('authorization');
//     if (!authHeader) {
//       return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
//     }

//     const token = authHeader.split(' ')[1];
//     if (!token) {
//       return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
//     }

//     await admin.auth().verifyIdToken(token);

//     // Get the content of the image from the URL
//     const imageBuffer = await fetch(imageUrl).then((res) => res.arrayBuffer());

//     // Convert the image buffer to a base64 encoded string
//     const imageBase64 = Buffer.from(imageBuffer).toString('base64');

//     // Prepare the request payload for Document AI
//     const requestPayload = {
//       rawDocument: {
//         content: imageBase64,
//         mimeType: 'image/jpeg',
//       },
//     };

//     // Make the prediction request to Document AI
//     const [result] = await documentAiClient.processDocument({
//       name: processorEndpoint,
//       rawDocument: {
//         content: imageBase64,
//         mimeType: 'image/jpeg',
//       },
//     });

//     // Save the result to the labeled bucket
//     const labeledFile = labeledBucket.file(`labeled_${new Date().toISOString()}.json`);
//     await labeledFile.save(JSON.stringify(result.document), {
//       resumable: false,
//     });

//     const publicUrl = `https://storage.googleapis.com/${labeledBucket.name}/${labeledFile.name}`;
//     return NextResponse.json({ document: result.document, labeledUrl: publicUrl }, { status: 200 });
//   } catch (error) {
//     console.error('Internal server error:', error);
//     return NextResponse.json({ message: 'Internal server error', error }, { status: 500 });
//   }
// }

// app/api/process-document-ai/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { labeledBucket } from '@/config/googleCloudConfig';
import admin from '@/config/firebaseAdmin';
import fetch from 'node-fetch';
import saveDocumentAiResults from '../../services/firebaseFirestore'

const processorEndpoint = 'https://us-documentai.googleapis.com/v1/projects/500843166981/locations/us/processors/9a89a0ae110dcf9e:process';

interface DocumentAIResponse {
  document: any;
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ message: 'Image URL is required' }, { status: 400 });
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

    // Filter out the 'pageAnchor' field from the results and format the data
    const filteredResults = result.document.entities.map((entity:any) => {
      const { pageAnchor, ...rest } = entity;
      return rest;
    });

    console.log('Saving result to labeled bucket...');
    const labeledFile = labeledBucket.file(`labeled_${new Date().toISOString()}.json`);
    await labeledFile.save(JSON.stringify(result.document), {
      resumable: false,
    });

    const publicUrl = `https://storage.googleapis.com/${labeledBucket.name}/${labeledFile.name}`;

    console.log('Saving result to Firestore...');
    const userId = 'user_2juPeshG9jlgucL1z3bsdgDDhOa'; // Replace with actual user ID
    await saveDocumentAiResults(userId, imageUrl, filteredResults);

    console.log('Processing completed successfully');
    return NextResponse.json({ document: filteredResults, labeledUrl: publicUrl }, { status: 200 });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ message: 'Internal server error', error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

