import { VertexAI } from '@google-cloud/vertexai';

// Initialize Vertex with your Cloud project and location
const vertexAI = new VertexAI({ project: 'cemta-firebase-auth', location: 'us-central1' });
const model = 'gemini-1.5-pro-preview-0409';

// Instantiate the models
const generativeModel = vertexAI.preview.getGenerativeModel({
  model: model,
  generationConfig: {
    'maxOutputTokens': 8192,
    'temperature': 1,
    'topP': 0.95,
  },
  safetySettings: [
    {
      'category': 'HARM_CATEGORY_HATE_SPEECH',
      'threshold': 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      'category': 'HARM_CATEGORY_DANGEROUS_CONTENT',
      'threshold': 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      'category': 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      'threshold': 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      'category': 'HARM_CATEGORY_HARASSMENT',
      'threshold': 'BLOCK_MEDIUM_AND_ABOVE'
    }
  ],
});

export async function generateContentFromImage(imageUrl: string) {
  const image = await fetchImageData(imageUrl);

  const imageData = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: image,
    }
  };

  const text = { text: `Read the menu image attached and place the content into four columns: original, price, pinyin, english.` };

  const req = {
    contents: [
      { role: 'user', parts: [imageData, text] }
    ],
  };

  const streamingResp = await generativeModel.generateContentStream(req);
  let response = '';

  for await (const item of streamingResp.stream) {
    response += item.content.parts[0].text;
  }

  return response;
}

async function fetchImageData(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}