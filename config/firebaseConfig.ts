import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// CEMTA web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase or use the existing app
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const db = getFirestore(app);
const auth = getAuth(app);

export const signInWithGooglePopup = () => signInWithPopup(auth, provider);

export { db, auth, app, firebaseConfig }; 






//----Old details with ocr and translate buttons----

// // Import the functions you need from the SDKs you need
// import { initializeApp, getApp, getApps } from 'firebase/app';
// import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
// import { getStorage } from 'firebase/storage';
// import { getAuth, signInWithRedirect, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, } from 'firebase/auth';
// import * as serviceAccount from './serviceAccount.json';

// // Optionally import the services you want to use on server-side (for SSR or Node.js environments)
// // These imports will not affect your bundle size in client-side code
// let visionClient, translationClient;
// if (typeof window === 'undefined') {
//   // Server-side code for @google-cloud services
//   const { ImageAnnotatorClient } = require('@google-cloud/vision');
//   const { TranslationServiceClient } = require('@google-cloud/translate');
 

//   visionClient = new ImageAnnotatorClient({ credentials: serviceAccount });
//   translationClient = new TranslationServiceClient({ credentials: serviceAccount });
// }

// // Your web app's Firebase configuration
// export const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
// };

// // Initialize Firebase or use the existing app
// let app;
// if (!getApps().length) {
//   app = initializeApp(firebaseConfig);
// } else {
//   app = getApp();
// }

// const provider = new GoogleAuthProvider();

// provider.setCustomParameters({ prompt: 'select_account', });

// const db = getFirestore(app);
// const storage = getStorage(app);
// const auth = getAuth(app);

// export const signInWithGooglePopup = () => signInWithPopup(auth, provider)

// export { db, storage, auth, visionClient, translationClient };
