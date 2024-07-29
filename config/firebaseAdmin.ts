// config/firebaseAdmin.ts
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS as string, 'utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
  });
}

export default admin;

