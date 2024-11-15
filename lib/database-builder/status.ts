// '@/lib/database-builder/status.ts'

import { db } from '@/config/firebaseConfig';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import type { ProcessingStatus, ProcessingStats } from './types';

// Initializes the processing status for a county
export async function initializeProcessingStatus(countyName: string): Promise<ProcessingStatus> {
  const status: ProcessingStatus = {
    countyName,
    status: 'processing',
    progress: 0,
    startTime: new Date(),
    lastUpdated: new Date(),
  };

  const statusRef = doc(db, 'processingStatus', countyName);
  await setDoc(statusRef, {
    ...status,
    startTime: serverTimestamp(),
    lastUpdated: serverTimestamp(),
  });

  return status;
}

// Updates the processing status of a county
export async function updateProcessingStatus(
  countyName: string,
  status: ProcessingStatus
): Promise<void> {
  const statusRef = doc(db, 'processingStatus', countyName);
  await setDoc(
    statusRef,
    {
      ...status,
      lastUpdated: serverTimestamp(),
    },
    { merge: true }
  );
}

// Creates an error status object for a county
export function createErrorStatus(countyName: string, error: string): ProcessingStatus {
  return {
    countyName,
    status: 'failed',
    progress: 0,
    startTime: new Date(),
    lastUpdated: new Date(),
    error,
  };
}

// Handles processing errors by updating the status accordingly
export async function handleProcessingError(
  countyName: string,
  error: unknown,
  status: ProcessingStatus
): Promise<ProcessingStatus> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  const errorStatus: ProcessingStatus = {
    ...status,
    status: 'failed',
    lastUpdated: new Date(),
    error: errorMessage,
  };

  await updateProcessingStatus(countyName, errorStatus);
  return errorStatus;
}

// Retrieves the latest processing status for a county
export async function getLatestProcessingStatus(
  countyName: string
): Promise<ProcessingStatus | null> {
  const statusDoc = await getDoc(doc(db, 'processingStatus', countyName));
  if (!statusDoc.exists()) return null;

  const data = statusDoc.data();
  return {
    ...data,
    startTime: data.startTime.toDate(),
    lastUpdated: data.lastUpdated.toDate(),
  } as ProcessingStatus;
}

// Retrieves the processing history for a county
export async function getCountyProcessingHistory(
  countyName: string,
  historyLimit = 10
): Promise<ProcessingStatus[]> {
  const historyQuery = query(
    collection(db, 'processingHistory'),
    where('countyName', '==', countyName),
    orderBy('startTime', 'desc'),
    firestoreLimit(historyLimit)
  );

  const snapshot = await getDocs(historyQuery);
  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    startTime: doc.data().startTime.toDate(),
    lastUpdated: doc.data().lastUpdated.toDate(),
  })) as ProcessingStatus[];
}