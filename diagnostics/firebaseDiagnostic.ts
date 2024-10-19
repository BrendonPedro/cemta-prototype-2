// diagnostics/firebaseDiagnostic.ts

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getStorage, ref, listAll } from "firebase/storage";

export async function runFirebaseDiagnostic() {
  console.log("Running Firebase Diagnostic...");

  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ];

  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      console.error(`Missing environment variable: ${varName}`);
    } else {
      console.log(`${varName} is set`);
    }
  });

  // Check Firebase initialization
  let app: FirebaseApp;
  try {
    if (getApps().length === 0) {
      app = initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      });
      console.log("Firebase app initialized successfully");
    } else {
      app = getApps()[0];
      console.log("Using existing Firebase app");
    }
  } catch (error) {
    console.error("Error initializing Firebase app:", error);
    return;
  }

  // Test Firebase Authentication
  try {
    const auth = getAuth(app);
    await signInAnonymously(auth);
    console.log("Anonymous authentication successful");
  } catch (error) {
    console.error("Error with Firebase Authentication:", error);
  }

  // Test Firestore
  try {
    const db = getFirestore(app);
    const testCollection = collection(db, "test");
    await getDocs(testCollection);
    console.log("Firestore read operation successful");
  } catch (error) {
    console.error("Error with Firestore:", error);
  }

  // Test Storage
  try {
    const storage = getStorage(app);
    const testRef = ref(storage, 'test');
    await listAll(testRef);
    console.log("Storage list operation successful");
  } catch (error) {
    console.error("Error with Storage:", error);
  }

  console.log("Firebase Diagnostic completed");
}