// app/actions/database.ts

'use server'

import { 
  CountyData, 
  ProcessingStats, 
  ProcessingStatus,
  ValidateSetupResult,
  CachedRestaurant 
} from '@/lib/database-builder/types';
import { 
  buildDatabase, 
  processBatch,
  initializeStats 
} from '@/lib/database-builder/core/builder';
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
import {
  createOrUpdateRestaurant,
  getCachedRestaurantsForLocation,
  batchUpdateRestaurants
} from '@/app/services/firebaseFirestore';
import { RestaurantData } from '@/lib/database-builder/types';
import { saveRestaurantData } from '@/app/services/firebaseFirestore';

import type { 
  ProcessingOptions,
  SerializableCounty, 
} from '@/lib/database-builder/types';
import { useImageUploader } from '@/lib/database-builder/services/image-handler';
import { processBatchImages, processAndUploadImage } from '@/lib/database-builder/services/image-handler-server';
import { verifyAndFixRestaurantCount } from '@/app/services/firebaseFirestore';

async function processCachedRestaurants(
  cached: CachedRestaurant[],
  countyName: string,
  townName: string,
  maxResults: number,
  options: ProcessingOptions & { incrementalUpdate?: boolean },
  totalStats: ProcessingStats,
  processedIds: Set<string>
): Promise<void> {
  const uniqueRestaurants = Array.from(
    new Map(cached.map(restaurant => [restaurant.id, restaurant])).values()
  );

  const remainingSlots = maxResults - processedIds.size;
  const newRestaurants = uniqueRestaurants
    .filter(r => !processedIds.has(r.id))
    .slice(0, remainingSlots);

  for (const restaurant of newRestaurants) {
    try {
      await saveRestaurantData(
        {
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.address,
          location: {
            lat: restaurant.latitude,
            lng: restaurant.longitude
          },
          rating: restaurant.rating || 0,
          googlePlaceId: restaurant.id,
          photos: restaurant.imageUrl ? [restaurant.imageUrl] : [],
          menuCount: restaurant.menuCount || 0,
          lastUpdated: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          source: {
            google: restaurant.hasGoogleData || false,
            yelp: restaurant.hasYelpData || false
          }
        },
        countyName,
        townName,
        true, // fromCache
        options.incrementalUpdate
      );
      
      processedIds.add(restaurant.id);
      totalStats.successful++;
      totalStats.cached++; // Increment cached count instead of API calls
      totalStats.totalProcessed++;
    } catch (error) {
      console.error(`Error processing restaurant ${restaurant.name}:`, error);
      totalStats.failed++;
    }
  }

  // Only verify counts once after processing all cached restaurants
  if (newRestaurants.length > 0) {
    await verifyAndFixRestaurantCount(countyName, townName);
  }
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
  county: SerializableCounty,
  options: ProcessingOptions & { 
    incrementalUpdate?: boolean 
  }
): Promise<{
  success: boolean;
  status?: ProcessingStatus;
  stats?: ProcessingStats;
  error?: string;
}> {
  let status: ProcessingStatus | undefined;

  try {
    // Validate setup
    const validationResult = await validateSetup(county.name);
    if (!validationResult.success) {
      return {
        success: false,
        status: validationResult.status,
        error: validationResult.error
      };
    }

    // Filter towns if specific ones are selected
    const townsToProcess = options.selectedTowns.length > 0
      ? county.towns.filter(town => options.selectedTowns.includes(town.name))
      : county.towns;

    // Initialize processing status
    status = await initializeProcessingStatus(county.name);

    // Handle cache operations
    if (options.clearCache) {
      console.log(`🧹 Clearing cache for ${county.name}`);
      await clearBuilderCache(undefined, undefined, county.name);
    }

    // Process towns in batches
    const batches = [];
    const batchSize = options.batchSize || 5;
    for (let i = 0; i < townsToProcess.length; i += batchSize) {
      batches.push(townsToProcess.slice(i, i + batchSize));
    }

    let totalStats = initializeStats();

    // Track processed restaurants for incremental updates
    const processedRestaurants = new Map<string, Set<string>>();

    // Initialize tracking for each town
    for (const town of townsToProcess) {
      processedRestaurants.set(town.name, new Set<string>());
      if (options.incrementalUpdate) {
        const townRef = doc(db, 'counties', county.name, 'towns', town.name);
        const existing = await getDocs(collection(townRef, 'restaurants'));
        existing.forEach(doc => {
          processedRestaurants.get(town.name)?.add(doc.id);
        });
      }
    }

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batchTowns = batches[i];
      
      for (const town of batchTowns) {
        try {
          const processedIds = processedRestaurants.get(town.name)!;
          
          // Check cache first
          const cached = !options.clearCache 
            ? await getCachedBuildData(
                town.location.lat,
                town.location.lng,
                county.name,
                town.name
              )
            : null;

          if (cached?.length) {
            console.log(`✅ Cache HIT for ${town.name}: Found ${cached.length} restaurants`);
            
            // Process cached data
            const maxToProcess = options.maxResults || 20;
            totalStats.cached += cached.length;

            await processCachedRestaurants(
              cached,
              county.name,
              town.name,
              maxToProcess,
              options,
              totalStats,
              processedIds
            );
          }

          // Process non-cached data if needed
          if (!options.checkCacheOnly) {
            const builderConfig = {
              googleApiKey: process.env.GOOGLE_MAPS_API_KEY!,
              yelpApiKey: process.env.YELP_API_KEY!,
              projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
              keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS!,
              firebaseToken: options.firebaseToken,
              clearCache: options.clearCache,
              maxResults: options.maxResults,
              testMode: options.testMode,
              checkCacheOnly: options.checkCacheOnly,
              incrementalUpdate: options.incrementalUpdate,
              signal: options.signal
            };

            const result = await buildDatabase(
              {
                name: county.name,
                towns: [town]
              },
              builderConfig
            );

            // Update total stats
            totalStats = {
              totalProcessed: totalStats.totalProcessed + result.totalProcessed,
              successful: totalStats.successful + result.successful,
              failed: totalStats.failed + result.failed,
              cached: totalStats.cached + result.cached,
              apiCalls: {
                google: totalStats.apiCalls.google + result.apiCalls.google,
                yelp: totalStats.apiCalls.yelp + result.apiCalls.yelp
              }
            };

            // Cache the results if any
            if (result.restaurants?.length) {
              await saveBuildCache(
                town.location.lat,
                town.location.lng,
                county.name,
                town.name,
                result.restaurants
              );
            }
          }

          // Verify counts after processing
          console.log(`\n🔍 Verifying counts for ${town.name} in ${county.name}`);
          await verifyAndFixRestaurantCount(county.name, town.name);
          console.log(`✅ Verified counts for ${town.name}`);

          // Update progress
          const progress = Math.floor(((i + 1) / batches.length) * 100);
          await updateProcessingStatus(county.name, {
            ...status,
            progress,
            stats: totalStats
          });
        } catch (error) {
          console.error(`Error processing town ${town.name}:`, error);
          totalStats.failed++;
        }
      }

      // Add delay between batches if not the last batch
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, options.delayBetweenBatches || 5000));
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

    // Final count verification
    try {
      console.log('\n🔍 Running final count verification for all towns...');
      for (const town of townsToProcess) {
        console.log(`\n📊 Final verification for ${town.name}`);
        await verifyAndFixRestaurantCount(county.name, town.name);
        console.log(`✅ Final verification complete for ${town.name}`);
      }
      console.log('✅ All town counts verified');
    } catch (error) {
      console.error('❌ Error in final count verification:', error);
    }
    
    return {
      success: true,
      status: finalStatus,
      stats: totalStats
    };

  } catch (error) {
    console.error('Server Action Error:', error);
    const errorStatus = status 
      ? await handleProcessingError(county.name, error, status)
      : createErrorStatus(county.name, error instanceof Error ? error.message : 'Unknown error');

    return {
      success: false,
      status: errorStatus,
      error: error instanceof Error ? error.message : 'Failed to process county'
    };
  }
}

// Helper functions for status management
async function initializeProcessingStatus(countyName: string): Promise<ProcessingStatus> {
  const status: ProcessingStatus = {
    countyName,
    status: 'processing',
    progress: 0,
    startTime: new Date(),
    lastUpdated: new Date()
  };

  const statusRef = doc(db, 'processingStatus', countyName);
  await setDoc(statusRef, {
    ...status,
    startTime: serverTimestamp(),
    lastUpdated: serverTimestamp()
  });

  return status;
}

async function updateProcessingStatus(
  countyName: string, 
  status: ProcessingStatus
): Promise<void> {
  const statusRef = doc(db, 'processingStatus', countyName);
  await setDoc(statusRef, {
    ...status,
    lastUpdated: serverTimestamp()
  }, { merge: true });
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

async function handleProcessingError(
  countyName: string, 
  error: unknown, 
  status: ProcessingStatus
): Promise<ProcessingStatus> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  const errorStatus: ProcessingStatus = {
    ...status,
    status: 'failed',
    lastUpdated: new Date(),
    error: errorMessage
  };

  await updateProcessingStatus(countyName, errorStatus);
  return errorStatus;
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

