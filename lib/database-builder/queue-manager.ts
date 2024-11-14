// lib/database-builder/queue-manager.ts

import { db } from './db';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  increment,
  Timestamp,
  serverTimestamp,
  writeBatch 
} from 'firebase/firestore';

import { CONFIG } from './config';

const COLLECTIONS = CONFIG.FIRESTORE.COLLECTIONS;
const DAILY_API_LIMIT = CONFIG.API.DAILY_LIMIT;
const MAX_ATTEMPTS = CONFIG.PROCESSING.QUEUE.MAX_ATTEMPTS;

// Types
export interface QueuedTown {
  id: string;
  countyName: string;
  townName: string;
  location: {
    lat: number;
    lng: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  lastAttempt?: Timestamp;
  attempts: number;
  apiCalls: {
    google: number;
    yelp: number;
  };
  restaurantsFound: number;
  error?: string;
  nextProcessingDate?: Timestamp;
}

export interface APIQuotaUsage {
  date: string; // YYYY-MM-DD
  googleAPICalls: number;
  yelpAPICalls: number;
  timestamp: Timestamp;
}

export interface ProcessingMetrics {
  lastProcessedTown?: string;
  totalTownsProcessed: number;
  totalRestaurantsFound: number;
  currentMonthAPICalls: number;
  dailyAPICallsAverage: number;
  startDate: Timestamp;
  lastUpdated: Timestamp;
}

// Queue Management Functions
export async function initializeQueue(towns: Array<{ 
  countyName: string; 
  townName: string; 
  location: { lat: number; lng: number; }; 
  priority?: number; 
}>) {
    const batch = writeBatch(db)
  
  for (const town of towns) {
    const queueRef = doc(collection(db, COLLECTIONS.PROCESSING_QUEUE));
    const queuedTown: QueuedTown = {
      id: queueRef.id,
      countyName: town.countyName,
      townName: town.townName,
      location: town.location,
      status: 'pending',
      priority: town.priority || CONFIG.PROCESSING.QUEUE.DEFAULT_PRIORITY,
      attempts: 0,
      apiCalls: {
        google: 0,
        yelp: 0
      },
      restaurantsFound: 0
    };
    
    batch.set(queueRef, queuedTown);
  }

  await batch.commit();
  console.log(`Initialized queue with ${towns.length} towns`);
}

export async function getNextTownToProcess(): Promise<QueuedTown | null> {
    try {
      // Check if we've hit daily API limit
      const usageToday = await getDailyAPIUsage();
      if (usageToday >= DAILY_API_LIMIT) {
        console.log(`Daily API limit reached: ${usageToday}/${DAILY_API_LIMIT}`);
        return null;
      }
  
      const q = query(
        collection(db, COLLECTIONS.PROCESSING_QUEUE),
        where('status', 'in', ['pending', 'failed']),
        where('attempts', '<', MAX_ATTEMPTS),
        orderBy('priority', 'desc'),
        orderBy('attempts', 'asc'),
        limit(1)
      );
  
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        console.log('No pending towns in queue');
        return null;
      }
  
      const town = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as QueuedTown;
  
      // Update status to processing
      await updateDoc(doc(db, COLLECTIONS.PROCESSING_QUEUE, town.id), {
        status: 'processing',
        lastAttempt: serverTimestamp(),
        attempts: increment(1)
      });
  
      return town;
    } catch (error) {
      console.error('Error getting next town:', error);
      return null;
    }
  }

  export async function trackAPICall(type: 'google' | 'yelp', townId: string) {
    const today = new Date().toISOString().split('T')[0];
    const usageRef = doc(db, COLLECTIONS.API_USAGE, today);
  
    console.log(`Tracking ${type} API call for town ${townId}`);
  
    try {
      await setDoc(usageRef, {
        [`${type}APICalls`]: increment(1),
        timestamp: serverTimestamp(),
        lastUpdated: serverTimestamp()
      }, { merge: true });
  
      if (townId) {
        await updateDoc(doc(db, COLLECTIONS.PROCESSING_QUEUE, townId), {
          [`apiCalls.${type}`]: increment(1),
          lastUpdated: serverTimestamp()
        });
      }
  
      // Log current usage
      const updatedUsage = await getDoc(usageRef);
      if (updatedUsage.exists()) {
        const data = updatedUsage.data();
        console.log(`Current API usage for today:`, {
          google: data.googleAPICalls || 0,
          yelp: data.yelpAPICalls || 0
        });
      }
    } catch (error) {
      console.error('Error tracking API call:', error);
      throw error;
    }
  }

export async function updateTownStatus(
  townId: string, 
  status: QueuedTown['status'], 
  restaurantsFound: number,
  error?: string
) {
  const townRef = doc(db, COLLECTIONS.PROCESSING_QUEUE, townId);
  
  await updateDoc(townRef, {
    status,
    restaurantsFound,
    ...(error && { error }),
    lastUpdated: serverTimestamp()
  });

  // Update metrics
  if (status === 'completed') {
    await updateProcessingMetrics(restaurantsFound);
  }
}

async function updateProcessingMetrics(newRestaurants: number) {
  const metricsRef = doc(db, COLLECTIONS.PROCESSING_METRICS, 'current');
  
  await setDoc(metricsRef, {
    totalTownsProcessed: increment(1),
    totalRestaurantsFound: increment(newRestaurants),
    lastUpdated: serverTimestamp()
  }, { merge: true });
}

export async function getDailyAPIUsage(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const usageDoc = await getDoc(doc(db, COLLECTIONS.API_USAGE, today));
    
    if (!usageDoc.exists()) {
      return 0;
    }
    
    const data = usageDoc.data() as APIQuotaUsage;
    const totalCalls = (data.googleAPICalls || 0) + (data.yelpAPICalls || 0);
    console.log(`Current daily API usage: ${totalCalls}/${DAILY_API_LIMIT}`);
    return totalCalls;
  }

export async function getProcessingMetrics(): Promise<ProcessingMetrics> {
  const metricsDoc = await getDoc(doc(db, COLLECTIONS.PROCESSING_METRICS, 'current'));
  if (!metricsDoc.exists()) {
    return {
      totalTownsProcessed: 0,
      totalRestaurantsFound: 0,
      currentMonthAPICalls: 0,
      dailyAPICallsAverage: 0,
      startDate: Timestamp.now(),
      lastUpdated: Timestamp.now()
    };
  }
  return metricsDoc.data() as ProcessingMetrics;
}

export async function getQueueStatus() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.PROCESSING_QUEUE));
  const stats = {
    total: snapshot.size,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };

  snapshot.forEach(doc => {
    const data = doc.data();
    stats[data.status as keyof typeof stats]++;
  });

  return stats;
}