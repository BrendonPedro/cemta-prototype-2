// services/firebaseFirestore.ts
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/config/firebaseConfig';

// Initialize Firebase app
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

export const saveDocumentAiResults = async (userId: string, imageUrl: string, documentAiResults: any) => {
  const userRef = doc(db, 'menus', userId);
  await setDoc(userRef, {
    imageUrl,
    documentAiResults,
    timestamp: serverTimestamp(),
  }, { merge: true });
};

export default saveDocumentAiResults;

