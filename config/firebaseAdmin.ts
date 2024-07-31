// config/firebaseAdmin.ts
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS as string, 'utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`,
  });
  console.log('Firebase Admin SDK initialized');
}

export default admin;




// config/firebaseAdmin.ts

// import admin from 'firebase-admin';

// const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
// const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n');

// if (!projectId || !clientEmail || !privateKey) {
//   throw new Error('Missing required Google Cloud environment variables');
// }

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert({
//       projectId,
//       clientEmail,
//       privateKey,
//     }),
//   });
// }

// export default admin;



