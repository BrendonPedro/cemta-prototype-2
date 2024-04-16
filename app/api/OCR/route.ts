import { GoogleAuth } from 'google-auth-library';
import { ImageAnnotatorClient } from '@google-cloud/vision';

export async function POST(request) {
  try {
    const auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = new ImageAnnotatorClient({ auth });
    const body = await request.json();
    const imageUrl = body.imageUrl;

    const [result] = await client.textDetection(imageUrl);
    const detections = result.textAnnotations;
    const ocrText = detections ? detections[0].description : 'No text detected';

    return new Response(JSON.stringify({ ocrText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error performing OCR:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
