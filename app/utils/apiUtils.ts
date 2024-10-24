// app/utils/apiUtils.ts

interface APICallMetrics {
  timestamp: number;
  endpoint: string;
  duration: number;
  success: boolean;
}

interface APIMetrics {
  calls: APICallMetrics[];
  totalCalls: number;
  successfulCalls: number;
  totalLatency: number;
}

export const apiMetrics: Record<string, APIMetrics> = {};

export function trackAPICall(endpoint: string, duration: number, success: boolean) {
  if (!apiMetrics[endpoint]) {
    apiMetrics[endpoint] = {
      calls: [],
      totalCalls: 0,
      successfulCalls: 0,
      totalLatency: 0
    };
  }

  apiMetrics[endpoint].calls.push({
    timestamp: Date.now(),
    endpoint,
    duration,
    success
  });

  apiMetrics[endpoint].totalCalls++;
  apiMetrics[endpoint].totalLatency += duration;
  if (success) {
    apiMetrics[endpoint].successfulCalls++;
  }

  // Keep only last 1000 calls
  if (apiMetrics[endpoint].calls.length > 1000) {
    apiMetrics[endpoint].calls.shift();
  }
}

export async function measureAPICall<T>(
  endpoint: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await apiCall();
    trackAPICall(endpoint, Date.now() - start, true);
    return result;
  } catch (error) {
    trackAPICall(endpoint, Date.now() - start, false);
    throw error;
  }
}

// Rate limiting using a Map instead of a class for simplicity
const rateLimits = new Map<string, { requests: number; lastReset: number }>();

export function checkRateLimit(endpoint: string, limit: number, intervalMs: number): boolean {
  const now = Date.now();
  const rateData = rateLimits.get(endpoint) || { requests: 0, lastReset: now };

  if (now - rateData.lastReset >= intervalMs) {
    rateData.requests = 0;
    rateData.lastReset = now;
  }

  if (rateData.requests >= limit) {
    return false;
  }

  rateData.requests++;
  rateLimits.set(endpoint, rateData);
  return true;
}