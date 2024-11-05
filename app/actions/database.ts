// app/actions/database.ts

'use server'

import { 
  CountyData, 
  ProcessingStats, 
  ProcessingStatus,
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
  limit as firestoreLimit,
  serverTimestamp, 
  deleteDoc,
} from 'firebase/firestore';
import { 
  getCachedBuildData, 
  saveBuildCache, 
  checkCountyCacheCoverage, 
  clearBuilderCache,
  clearLocationCache  
} from '@/lib/database-builder/cache';
import type { EnhancedCountyData } from '@/lib/data/counties';
import type { BuilderConfig } from '@/lib/database-builder/core/builder'

export interface ProcessingOptions {
  selectedTowns?: string[];
  force?: boolean;
  updateExisting?: boolean;
  clearCache?: boolean;
  batchSize?: number;
  delayBetweenBatches?: number;
  firebaseToken?: string;
  maxResults?: number;
  testMode?: boolean;
  checkCacheOnly?: boolean;
}

export interface BuildDatabaseResult {
  success: boolean;
  status?: ProcessingStatus;
  stats?: ProcessingStats;
  error?: string;
}

async function validateSetup(countyName: string): Promise<ValidateSetupResult> {
  const requiredEnvVars = [
    'GOOGLE_MAPS_API_KEY',
    'YELP_API_KEY',
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_APPLICATION_CREDENTIALS'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      const errorStatus = createErrorStatus(countyName, `Missing ${envVar}`);
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
      countyName,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      lastUpdated: new Date()
    }
  };
}

export async function buildCountyDatabase(
  county: EnhancedCountyData,
  options: ProcessingOptions = {}
): Promise<BuildDatabaseResult> {
  let status: ProcessingStatus | undefined;

  try {
    const {
      selectedTowns,
      force = false,
      clearCache = false,
      batchSize = 5,
      delayBetweenBatches = 5000,
      firebaseToken,
      maxResults,
      testMode,
      checkCacheOnly
    } = options;

    // Pass all options to the config object
    const config: BuilderConfig = {
      googleApiKey: process.env.GOOGLE_MAPS_API_KEY!,
      yelpApiKey: process.env.YELP_API_KEY!,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS!,
      firebaseToken,
      clearCache,
      maxResults,
      testMode,
      checkCacheOnly
    };

    // Validate setup
    const validationResult = await validateSetup(county.name);
    if (!validationResult.success) {
      return {
        success: false,
        status: validationResult.status,
        error: validationResult.error
      };
    }

    // Clear county-level cache if requested
    if (clearCache) {
      await clearBuilderCache(undefined, undefined, county.name);
    }

    // Filter towns if specific ones are selected
    const townsToProcess = selectedTowns?.length 
      ? county.towns.filter(town => selectedTowns.includes(town.name))
      : county.towns;

    // Process towns in batches
    const batches = [];
    for (let i = 0; i < townsToProcess.length; i += batchSize) {
      batches.push(townsToProcess.slice(i, i + batchSize));
    }


    let totalStats: ProcessingStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      cached: 0,
      apiCalls: {
        google: 0,
        yelp: 0
      }
    };

    // Initialize processing status
    const status = await initializeProcessingStatus(county.name);

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batchTowns = batches[i];
      
      for (const town of batchTowns) {
        // Check cache first
        const cachedData = !force 
          ? await getCachedBuildData(
              town.location.lat,
              town.location.lng,
              county.name,
              town.name
            )
          : null;

        if (cachedData) {
          console.log(`Using cache for ${town.name}`);
          totalStats.cached += cachedData.length;
          totalStats.totalProcessed += cachedData.length;
        } else {
          const townData: CountyData = {
            name: county.name,
            towns: [town]
          };

          const townStats = await processCounty(townData, config);

          // Update total stats
          totalStats = combineStats(totalStats, townStats);

          // Cache the results
          if (townStats.restaurants?.length) {
            await saveBuildCache(
              town.location.lat,
              town.location.lng,
              county.name,
              town.name,
              townStats.restaurants
            );
          }
        }

    // Update progress
        const progress = Math.floor(((i + 1) / batches.length) * 100);
        await updateProcessingStatus(county.name, {
          ...status,
          progress,
          stats: totalStats
        });
      }

      // Wait between batches if not the last batch
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

     // Update final status
    const finalStatus = {
      ...status,
      status: 'completed' as const,
      progress: 100,
      stats: totalStats,
      lastUpdated: new Date()
    };
    await updateProcessingStatus(county.name, finalStatus);

    // Revalidate paths
    revalidatePath('/restaurants');
    revalidatePath(`/counties/${county.name.toLowerCase()}`);
    revalidatePath('/dashboard');

    return {
      success: true,
      status: finalStatus,
      stats: totalStats
    };
  } catch (error) {
    console.error('Error building county database:', error);
    // If status wasn't initialized, create a basic error status
    const errorStatus: ProcessingStatus = status || {
      countyName: county.name,
      status: 'failed',
      progress: 0,
      startTime: new Date(),
      lastUpdated: new Date()
    };
    return handleProcessingError(county.name, error, errorStatus);
  }
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

function combineStats(existing: ProcessingStats, newStats: ProcessingStats): ProcessingStats {
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

// Update the handleProcessingError function to handle the status parameter correctly
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
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    startTime: doc.data().startTime.toDate(),
    lastUpdated: doc.data().lastUpdated.toDate()
  })) as ProcessingStatus[];
}

export type { ProcessingStatus };