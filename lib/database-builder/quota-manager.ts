import { db } from './db';
import { 
  doc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc,
  increment, 
  serverTimestamp,
  Timestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';

export interface QuotaStats {
  dailyCallsUsed: number;
  lastReset: Timestamp;
  monthlyCallsUsed: number;
  monthlyReset: Timestamp;
}

export interface ProcessingQuota {
  dailyLimit: number;
  monthlyLimit: number;
  reservedQuota: number;
  warningThreshold: number;
}

const DEFAULT_QUOTA: ProcessingQuota = {
  dailyLimit: 1000,    // Free tier daily limit
  monthlyLimit: 30000, // Estimated monthly limit
  reservedQuota: 50,   // Keep 50 calls reserved
  warningThreshold: 80 // Warn at 80% usage
};

export async function getQuotaStats(): Promise<QuotaStats> {
  const statsRef = doc(db, 'system', 'apiQuota');
  const statsDoc = await getDoc(statsRef);
  
  if (!statsDoc.exists()) {
    const initialStats: QuotaStats = {
      dailyCallsUsed: 0,
      lastReset: Timestamp.now(),
      monthlyCallsUsed: 0,
      monthlyReset: Timestamp.now()
    };
    await setDoc(statsRef, initialStats);
    return initialStats;
  }
  
  return statsDoc.data() as QuotaStats;
}

function shouldResetDaily(lastReset: Timestamp): boolean {
  const now = Timestamp.now();
  const oneDayInSeconds = 24 * 60 * 60;
  return (now.seconds - lastReset.seconds) >= oneDayInSeconds;
}

function shouldResetMonthly(lastReset: Timestamp): boolean {
  const now = new Date();
  const lastResetDate = lastReset.toDate();
  return lastResetDate.getMonth() !== now.getMonth() ||
         lastResetDate.getFullYear() !== now.getFullYear();
}

export async function checkAndResetQuota(): Promise<void> {
  const stats = await getQuotaStats();
  const now = Timestamp.now();
  const statsRef = doc(db, 'system', 'apiQuota');

  // Check if daily reset is needed
  if (shouldResetDaily(stats.lastReset)) {
    await updateDoc(statsRef, {
      dailyCallsUsed: 0,
      lastReset: now
    });
  }

  // Check if monthly reset is needed
  if (shouldResetMonthly(stats.monthlyReset)) {
    await updateDoc(statsRef, {
      monthlyCallsUsed: 0,
      monthlyReset: now
    });
  }
}

export async function canMakeApiCall(requiredCalls: number = 1): Promise<boolean> {
  await checkAndResetQuota();
  const stats = await getQuotaStats();

  const dailyRemaining = DEFAULT_QUOTA.dailyLimit - stats.dailyCallsUsed;
  const monthlyRemaining = DEFAULT_QUOTA.monthlyLimit - stats.monthlyCallsUsed;
  const effectiveLimit = Math.min(dailyRemaining, monthlyRemaining);

  const availableQuota = Math.max(0, effectiveLimit - DEFAULT_QUOTA.reservedQuota);
  return availableQuota >= requiredCalls;
}

export async function trackApiCall(): Promise<void> {
  const statsRef = doc(db, 'system', 'apiQuota');
  await updateDoc(statsRef, {
    dailyCallsUsed: increment(1),
    monthlyCallsUsed: increment(1),
    lastUpdated: serverTimestamp()
  });
}

export async function getOptimalBatchSize(): Promise<number> {
  const stats = await getQuotaStats();
  const remainingDaily = DEFAULT_QUOTA.dailyLimit - stats.dailyCallsUsed;
  
  if (remainingDaily > 500) return 20;
  if (remainingDaily > 200) return 15;
  if (remainingDaily > 100) return 10;
  return 5;
}

export interface ProcessingStrategy {
  batchSize: number;
  maxResults: number;
  shouldUseCacheOnly: boolean;
  waitTime: number;
}

export async function suggestProcessingStrategy(): Promise<ProcessingStrategy> {
  const stats = await getQuotaStats();
  const remainingDaily = DEFAULT_QUOTA.dailyLimit - stats.dailyCallsUsed;
  const quotaPercentage = (stats.dailyCallsUsed / DEFAULT_QUOTA.dailyLimit) * 100;

  // Adjust strategy based on remaining quota
  if (quotaPercentage > DEFAULT_QUOTA.warningThreshold) {
    return {
      batchSize: 5,
      maxResults: 10,
      shouldUseCacheOnly: true,
      waitTime: 5000
    };
  }

  if (remainingDaily > 500) {
    return {
      batchSize: 20,
      maxResults: 40, // Default UI input when processing
      shouldUseCacheOnly: false,
      waitTime: 2000
    };
  }

  return {
    batchSize: 10,
    maxResults: 20,
    shouldUseCacheOnly: false,
    waitTime: 3000
  };
}

interface TownCoverageStats {
  name: string;
  restaurantCount: number;
  populationDensity: number;
}

interface CountyCoverage {
  towns: TownCoverageStats[];
}

async function getCountyCoverage(countyName: string): Promise<CountyCoverage> {
  const countyRef = doc(db, 'counties', countyName);
  const townsSnapshot = await getDocs(collection(countyRef, 'towns'));
  
  const towns = await Promise.all(townsSnapshot.docs.map(async townDoc => {
    const townData = townDoc.data();
    return {
      name: townData.name,
      restaurantCount: townData.restaurantCount || 0,
      populationDensity: townData.populationDensity || 1
    };
  }));

  return { towns };
}

export interface OptimizedProcessing extends ProcessingStrategy {
  processingOrder: string[];
}

export async function optimizeProcessing(
  countyName: string,
  townCount: number
): Promise<OptimizedProcessing> {
  const strategy = await suggestProcessingStrategy();
  const processingOrder = await calculateProcessingOrder(countyName, townCount);
  
  return {
    ...strategy,
    processingOrder
  };
}

async function calculateProcessingOrder(
  countyName: string, 
  townCount: number
): Promise<string[]> {
  const coverageStats = await getCountyCoverage(countyName);
  
  return coverageStats.towns
    .sort((a, b) => {
      const aCoverage = a.restaurantCount / (a.populationDensity || 1);
      const bCoverage = b.restaurantCount / (b.populationDensity || 1);
      return aCoverage - bCoverage;
    })
    .map(town => town.name);
}

export const DEFAULT_PROCESSING_STRATEGY: ProcessingStrategy = {
  batchSize: 10,
  maxResults: 20,
  shouldUseCacheOnly: false,
  waitTime: 3000
};