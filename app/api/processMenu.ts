'use client'
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
// Importing types for Google Cloud Vision and Translate clients
import {
  ImageAnnotatorClient,
  // ImageAnnotatorClientOptions,
} from "@google-cloud/vision";
import {
  TranslationServiceClient,
  // TranslationServiceClientOptions,
} from "@google-cloud/translate";
import serviceAccount from "@/config/Firebase/serviceAccount.json"; // Ensure this import matches the format of your service account JSON

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase or use the existing app
let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

// Initialize Google Cloud Vision and Translate clients with explicit types
let visionClient: ImageAnnotatorClient | undefined;
let translationClient: TranslationServiceClient | undefined;

// Ensure this code runs server-side
if (typeof window === "undefined") {
  visionClient = new ImageAnnotatorClient({
    credentials: serviceAccount as any,
  });

  translationClient = new TranslationServiceClient({
    credentials: serviceAccount as any,
  });

}
  export { db, storage, visionClient, translationClient };