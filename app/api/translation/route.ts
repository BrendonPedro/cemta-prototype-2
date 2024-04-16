// translation/route.ts
import { TranslationServiceClient } from '@google-cloud/translate';
import { GoogleAuth } from 'google-auth-library';

export async function POST(request) {
  try {
    // Assuming you're using some environment variables for the Google Cloud setup
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!projectId) {
      throw new Error("Google Cloud project ID is not set.");
    }

    // Initialize the Google Auth library with your Google Cloud key file
    const auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Ensure this file is correctly configured in your environment
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    // Initialize the translation client with authentication
    const client = new TranslationServiceClient({ auth });

    // Assuming `request.json()` is a method to parse JSON body from the incoming request
    const body = await request.json();
    const textToTranslate = body.text;
    if (!textToTranslate) {
      throw new Error("No text provided for translation.");
    }

    // Specify request details for the Google Cloud Translation API
    const requestConfig = {
      parent: `projects/${projectId}/locations/global`,
      contents: [textToTranslate],
      mimeType: 'text/plain', // MIME type of the input
      sourceLanguageCode: 'zh', // Assuming the text is in Chinese
      targetLanguageCode: 'en', // Translate to English
    };

    // Perform the translation
    const [response] = await client.translateText(requestConfig);
    const translations = response.translations;
    const translatedText = translations.map(trans => trans.translatedText).join(' ');

    return new Response(JSON.stringify({ translatedText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error performing translation:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
