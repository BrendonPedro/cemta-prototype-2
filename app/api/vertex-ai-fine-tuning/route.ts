// app/api/vertex-ai-fine-tuning/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import { Storage } from '@google-cloud/storage';
import { db } from '@/config/firebaseConfig';
import { collection, addDoc, getDocs } from 'firebase/firestore';

// Initialize Vertex AI and Cloud Storage
const projectId = 'cemta-prototype-2';
const location = 'us-central1';
const vertexAI = new VertexAI({ project: projectId, location });
const storage = new Storage();

interface ProcessedMenu extends Menu {
  result: any; // Replace 'any' with a more specific type if possible
}

interface Menu {
  id: string;
  imageUrl: string;
  userId: string;
  menuName: string;
  restaurantName: string;
  location?: string;
  timestamp: string;
  menuData: {
    restaurant_info: {
      name: { original: string; english: string };
      address: { original: string; english: string };
      operating_hours: string;
      phone_number: string;
      website: string;
      social_media: string;
      description: { original: string; english: string };
      additional_notes: string;
    };
    categories: Array<{
      name: { original: string; english: string; pinyin: string };
      items: Array<MenuItem>;
    }>;
    other_info: string;
  };
}

interface MenuItem {
  name: { original: string; english: string; pinyin: string };
  price?: { amount: number; currency: string };
  prices?: { [key: string]: string };
  description: { original: string; english: string };
  // Add other properties as needed
}

export async function POST(req: NextRequest) {
  try {
    // Step 1: Get unlabeled menu images from Firestore
    const unlabeledMenus = await getUnlabeledMenus();

    // Step 2: Process menus with Vertex AI
    const processedMenus = await processMenus(unlabeledMenus);

    // Step 3: Store JSON output in Cloud Storage
    await storeJSONOutput(processedMenus);

    // Step 4: Prepare data for fine-tuning
    const trainingDataUri = await prepareTrainingData(processedMenus);

    // Step 5: Initiate fine-tuning job
    const fineTuningJobId = await initiateFinetuning(trainingDataUri);

    return NextResponse.json({ success: true, fineTuningJobId });
  } catch (error) {
    console.error('Error in fine-tuning workflow:', error);
    return NextResponse.json({ success: false, error: 'Fine-tuning workflow failed' }, { status: 500 });
  }
}

async function getUnlabeledMenus(): Promise<Menu[]> {
  const menusRef = collection(db, 'unlabeledMenus');
  const snapshot = await getDocs(menusRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Menu));
}

async function processMenus(menus: Menu[]): Promise<ProcessedMenu[]> {
  const processedMenus: ProcessedMenu[] = [];
  for (const menu of menus) {
    const response = await fetch('/api/vertex-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(menu),
    });
    const result = await response.json();
    processedMenus.push({ ...menu, result });
  }
  return processedMenus;
}

async function storeJSONOutput(processedMenus: ProcessedMenu[]): Promise<void> {
  const bucket = storage.bucket('your-bucket-name');
  for (const menu of processedMenus) {
    const file = bucket.file(`menus/${menu.id}/output.json`);
    await file.save(JSON.stringify(menu.result.menuData));
  }
}

async function prepareTrainingData(processedMenus: ProcessedMenu[]): Promise<string> {
  const trainingData = processedMenus.map(menu => ({
    image_uri: `gs://your-bucket-name/menus/${menu.id}/image.jpg`,
    output_uri: `gs://your-bucket-name/menus/${menu.id}/output.json`
  }));
  const trainingDataFile = storage.bucket('your-bucket-name').file('training-data.jsonl');
  await trainingDataFile.save(trainingData.map(item => JSON.stringify(item)).join('\n'));

  return `gs://your-bucket-name/training-data.jsonl`;
}

async function initiateFinetuning(trainingDataUri: string): Promise<string> {
  // TODO: Implement the actual fine-tuning job creation
  console.log(`Initiating fine-tuning with data from: ${trainingDataUri}`);
  return 'dummy-job-id';
}
