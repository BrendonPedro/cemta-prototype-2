// app/actions/database.ts

'use server'

import { 
  CountyData, 
  ProcessingStats, 
  ProcessingStatus,  // Import from types.ts instead of defining here
  ValidateSetupResult,
  CachedRestaurant 
} from '@/lib/database-builder/types';
import { processCounty } from '@/lib/database-builder';
import { revalidatePath } from 'next/cache';
import { db } from '@/config/firebaseConfig';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  query, 
  where, 
  getDocs,
  orderBy, 
  limit as firestoreLimit,  // Rename to avoid conflict
  serverTimestamp, 
  deleteDoc,
} from 'firebase/firestore'
import { 
  getCachedBuildData, 
  saveBuildCache, 
  checkCountyCacheCoverage, 
  clearBuilderCache 
} from '@/lib/database-builder/cache';

export interface BuildDatabaseResult {
  success: boolean;
  status: ProcessingStatus;
  stats?: ProcessingStats;
  error?: string;
}

async function validateSetup(countyData: CountyData): Promise<ValidateSetupResult> {
  const requiredEnvVars = [
    'GOOGLE_MAPS_API_KEY',
    'YELP_API_KEY',
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_APPLICATION_CREDENTIALS'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      const errorStatus = createErrorStatus(countyData.name, `Missing ${envVar}`);
      return {
        success: false,
        status: errorStatus,
        error: `Missing ${envVar}`
      };
    }
  }

  return { 
    success: true,
    status: {
      countyName: countyData.name,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      lastUpdated: new Date()
    }
  };
}

function updateStats(current: ProcessingStats, newData: Partial<ProcessingStats>): ProcessingStats {
  return {
    totalProcessed: newData.totalProcessed || current.totalProcessed || 0,
    successful: newData.successful || current.successful || 0,
    failed: newData.failed || current.failed || 0,
    cached: newData.cached || current.cached || 0,
    apiCalls: {
      google: newData.apiCalls?.google || current.apiCalls.google || 0,
      yelp: newData.apiCalls?.yelp || current.apiCalls.yelp || 0
    }
  };
}

async function clearCache(countyName: string, townName?: string): Promise<void> {
  const cacheQuery = townName 
    ? query(
        collection(db, 'databaseBuilderCache'),
        where('countyName', '==', countyName),
        where('townName', '==', townName)
      )
    : query(
        collection(db, 'databaseBuilderCache'),
        where('countyName', '==', countyName)
      );

  const snapshot = await getDocs(cacheQuery);
  await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
}

async function initializeProcessingStatus(countyName: string): Promise<ProcessingStatus> {
  const status: ProcessingStatus = {
    countyName,
    status: 'processing',
    progress: 0,
    startTime: new Date(),
    lastUpdated: new Date()
  };

  await setDoc(
    doc(db, 'processingStatus', countyName),
    {
      ...status,
      startTime: serverTimestamp(),
      lastUpdated: serverTimestamp()
    }
  );

  return status;
}

async function updateProcessingStatus(
  countyName: string, 
  status: ProcessingStatus
): Promise<void> {
  await setDoc(
    doc(db, 'processingStatus', countyName),
    {
      ...status,
      lastUpdated: serverTimestamp()
    },
    { merge: true }
  );
}

export async function buildCountyDatabase(
  countyData: CountyData,
  options: {
    force?: boolean;
    updateExisting?: boolean;
    clearCache?: boolean;
  } = {}
): Promise<BuildDatabaseResult> {
  console.log(`Starting database build for ${countyData.name}`);

  const validationResult = await validateSetup(countyData);
  if (!validationResult.success || !validationResult.status) {
    return {
      success: false,
      status: validationResult.status || createErrorStatus(countyData.name, 'Validation failed'),
      error: validationResult.error || 'Unknown validation error'
    };
  }

  if (options.clearCache) {
    await clearBuilderCache(countyData.name);
  }

  const cacheCoverage = await checkCountyCacheCoverage(countyData.name);
  console.log('Cache coverage:', cacheCoverage);

  const status = await initializeProcessingStatus(countyData.name);
  
  try {
    const totalTowns = countyData.towns.length;
    for (let i = 0; i < totalTowns; i++) {
      const town = countyData.towns[i];
      const progress = Math.floor(((i + 1) / totalTowns) * 100);
      
      const cachedData = !options.force 
        ? await getCachedBuildData(
            town.location.lat,
            town.location.lng,
            countyData.name,
            town.name
          )
        : null;

      if (cachedData) {
        console.log(`Using builder cache for ${town.name}`);
        status.stats = status.stats ? updateStats(status.stats, {
          cached: (status.stats.cached || 0) + cachedData.length,
          totalProcessed: (status.stats.totalProcessed || 0) + cachedData.length
        }) : {
          totalProcessed: cachedData.length,
          successful: 0,
          failed: 0,
          cached: cachedData.length,
          apiCalls: { google: 0, yelp: 0 }
        };
      } else {
        const townStats = await processCounty(
          { name: countyData.name, towns: [town] },
          {
            googleApiKey: process.env.GOOGLE_MAPS_API_KEY!,
            yelpApiKey: process.env.YELP_API_KEY!,
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS!
          }
        );

        if (townStats.restaurants && townStats.restaurants.length > 0) {
          await saveBuildCache(
            town.location.lat,
            town.location.lng,
            countyData.name,
            town.name,
            townStats.restaurants
          );
        }

        status.stats = combineStats(status.stats, townStats);
      }

      status.progress = progress;
      await updateProcessingStatus(countyData.name, status);
    }

    const finalStatus = {
      ...status,
      status: 'completed' as const,
      progress: 100,
      lastUpdated: new Date()
    };
    await updateProcessingStatus(countyData.name, finalStatus);

    revalidatePath('/restaurants');
    revalidatePath(`/counties/${countyData.name.toLowerCase()}`);
    revalidatePath('/dashboard');

    return {
      success: true,
      status: finalStatus,
      stats: status.stats
    };

  } catch (error) {
    return handleProcessingError(countyData.name, error, status);
  }
}

function handleProcessingError(
  countyName: string, 
  error: unknown, 
  status: ProcessingStatus
): BuildDatabaseResult {
  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
  const errorStatus: ProcessingStatus = {
    ...status,
    status: 'failed',
    lastUpdated: new Date(),
    error: errorMessage
  };

  updateProcessingStatus(countyName, errorStatus).catch(console.error);
  
  return {
    success: false,
    status: errorStatus,
    error: errorMessage
  };
}

function createErrorStatus(countyName: string, error: string): ProcessingStatus {
  return {
    countyName,
    status: 'failed',
    progress: 0,
    startTime: new Date(),
    lastUpdated: new Date(),
    error
  };
}

function combineStats(existing: ProcessingStats | undefined, newStats: ProcessingStats): ProcessingStats {
  if (!existing) return newStats;
  return {
    totalProcessed: existing.totalProcessed + newStats.totalProcessed,
    successful: existing.successful + newStats.successful,
    failed: existing.failed + newStats.failed,
    cached: existing.cached + newStats.cached,
    apiCalls: {
      google: existing.apiCalls.google + newStats.apiCalls.google,
      yelp: existing.apiCalls.yelp + newStats.apiCalls.yelp
    }
  };
}

export async function getLatestProcessingStatus(countyName: string): Promise<ProcessingStatus | null> {
  const statusDoc = await getDoc(doc(db, 'processingStatus', countyName));
  if (!statusDoc.exists()) return null;
  
  const data = statusDoc.data();
  return {
    ...data,
    startTime: data.startTime.toDate(),
    lastUpdated: data.lastUpdated.toDate()
  } as ProcessingStatus;
}

export type { ProcessingStatus };

export async function getCountyProcessingHistory(
  countyName: string,
  historyLimit = 10
): Promise<ProcessingStatus[]> {
  const historyQuery = query(
    collection(db, 'processingHistory'),
    where('countyName', '==', countyName),
    orderBy('startTime', 'desc'),
    firestoreLimit(historyLimit)  // Use renamed import
  );

  const snapshot = await getDocs(historyQuery);
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    startTime: doc.data().startTime.toDate(),
    lastUpdated: doc.data().lastUpdated.toDate()
  })) as ProcessingStatus[];
}

