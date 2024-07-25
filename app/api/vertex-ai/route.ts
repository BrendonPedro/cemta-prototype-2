// pages/api/OCR/route.ts
import { VertexAI } from '@google-cloud/vertexai';
import { GoogleAuth } from 'google-auth-library';

export async function POST(request) {
  try {
    // Setup the authentication for Google Cloud services
    const auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    // Initialize Vertex AI with your project details
    const projectId = 'cemta-firebase-auth';
    const location = 'us-central1';
    const model = 'gemini-1.5-pro-preview-0409';

    const vertexAI = new VertexAI({ project: projectId, location: location, auth });

    const body = await request.json();
    const imageUrl = body.imageUrl;
    const imageBase64 = await getBase64(imageUrl); // Function to convert image URL to base64

    const generativeVisionModel = vertexAI.getGenerativeModel({ model: model });

    // Prepare the OCR request
const ocrRequest = {
  contents: [{
    role: 'user',
    parts: [{
      inlineData: {
        data: imageBase64,
        mimeType: 'image/png',
      }
    }, {
      //the text parameter as per the model's requirements (what we want it to do with the image)
      text: `Read the menu image attached and place the content into a table with 4 columns: original, price, pinyin, English.`
    }]
  }]
};

    // Send the OCR request and wait for the response
    const response = await generativeVisionModel.generateContent(ocrRequest);
    const aggregatedResponse = await response.response;
    const ocrText = aggregatedResponse.candidates[0].content.parts[0].text;

     // Convert the OCR text into a simple markdown list
    const lines = ocrText.split('\n'); // Split by newline characters
    const markdownLines = lines.map(line => `* ${line}`);
    const markdownText = markdownLines.join('\n'); // Join back into a single string with newline characters

  //    // Parse the OCR text into structured data
  // const lines = ocrText.split('\n');
  // const menuItems = lines.map((line) => {
  //   // Simple split logic; you'd need a more robust parser for complex data
  //   const parts = line.split(/\s{2,}/); // splits by 2 or more spaces
  //   return {
  //     original: parts[0] || '', // Assuming the first part is the original text
  //     price: parts[1] || '',    // Assuming the second part is the price
  //     pinyin: parts[2] || '',   // Assuming the third part is the pinyin
  //     english: parts[3] || '',  // Assuming the fourth part is the English translation
  //   };
  // });


    return new Response(JSON.stringify({ ocrText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error performing OCR with Vertex AI:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Utility function to convert image URL to base64
async function getBase64(url) {
  const axios = require('axios');
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data).toString('base64');
}
