import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/config/Firebase/firebaseConfig';
import { TranslationServiceClient } from '@google-cloud/translate';
import { getStorage } from 'firebase/storage';

const projectId = process.env.GCP_PROJECT_ID;
const location = 'global';
const bucketName = process.env.GCLOUD_STORAGE_BUCKET;

// Initialize the Translation client
const translationClient = new TranslationServiceClient();

// The main function to translate text
async function translateText(text: string, targetLanguage: string): Promise<string> {
  // Construct request
  const request = {
    parent: `projects/${projectId}/locations/${location}`,
    contents: [text],
    mimeType: 'text/plain',
    targetLanguageCode: targetLanguage,
  };

  // Run request
  const [response] = await translationClient.translateText(request);

  return response.translations[0].translatedText;
}

// Function to save the translation to Firestore
async function saveTranslationToFirestore(documentId: string, translatedText: string) {
  const docRef = db.collection('menus').doc(documentId);
  await docRef.update({ translatedText });
}

// Function to save the translation report to Google Cloud Storage
async function saveTranslationReportToStorage(fileName: string, content: string) {
  const storage = getStorage();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(`translated-reports/${fileName}.txt`);
  await file.save(content, {
    metadata: { contentType: 'text/plain' },
  });
}

export const runtime = {
  runtime: 'experimental-edge',
};

// Next.js 14 server component handler
export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new NextResponse(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const { documentId } = await req.json();
  const docRef = db.collection('menus').doc(documentId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return new NextResponse(JSON.stringify({ error: 'Document not found' }), { status: 404 });
  }

  const menuData = doc.data();
  const ocrText = menuData?.detectedText;
  if (!ocrText) {
    return new NextResponse(JSON.stringify({ error: 'OCR text not found' }), { status: 404 });
  }

  const translatedText = await translateText(ocrText, menuData.targetLanguageCode);

  await saveTranslationToFirestore(documentId, translatedText);
  
  const reportFileName = `${documentId}_${Date.now()}`;
  await saveTranslationReportToStorage(reportFileName, translatedText);

  return new NextResponse(JSON.stringify({ message: 'Translation successful', documentId, translatedText }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
