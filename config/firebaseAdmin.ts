// config/firebaseAdmin.ts
import admin from "firebase-admin";
import { readFileSync } from "fs";

if (!admin.apps.length) {
  try {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!serviceAccountPath) {
      throw new Error("GOOGLE_APPLICATION_CREDENTIALS environment variable is not set");
    }

    const serviceAccount = JSON.parse(
      readFileSync(serviceAccountPath, "utf-8")
    );

    admin.initializeApp({
      credential: admin.credential.cert({
        ...serviceAccount,
        projectId: "cemta-prototype-3", // Keep original Firebase project ID
      }),
      databaseURL: `https://cemta-prototype-3.firebaseio.com`, // Original Firebase
    });
    console.log("Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
    throw error;
  }
}

export default admin;
export const auth = admin.auth();