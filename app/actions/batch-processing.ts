// app/actions/batch-processing.ts
'use server'

import { buildDatabase, processBatch } from '@/lib/database-builder/core/builder';
import { auth } from '@/config/firebaseAdmin';
import type { EnhancedCountyData, EnhancedTownData } from '@/lib/data/counties';
import { verifyAndFixRestaurantCount } from '../services/firebaseFirestore';

export interface BatchProgress {
  currentCounty: string;
  currentTown: string;
  processedTowns: number;
  totalTowns: number;
  processedRestaurants: number;
}

export async function processBatchServer(
  selectedAreas: {
    county: EnhancedCountyData;
    towns: EnhancedTownData[];
  }[],
  options: { incrementalUpdate?: boolean } = {}
) {
  if (!process.env.GOOGLE_MAPS_API_KEY || 
      !process.env.YELP_API_KEY || 
      !process.env.GOOGLE_CLOUD_PROJECT_ID || 
      !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Missing required environment variables');
  }

  const config = {
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY,
    yelpApiKey: process.env.YELP_API_KEY,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    incrementalUpdate: options.incrementalUpdate
  };

  let processedTowns = 0;
  let processedRestaurants = 0;
  const totalTowns = selectedAreas.reduce((sum, area) => sum + area.towns.length, 0);
  const results = [];

  for (const area of selectedAreas) {
    const { county, towns } = area;

    for (const town of towns) {
      try {
        console.log(`Processing ${town.name} in ${county.name}`);
        
        // Add config for proper counts handling
        const builderConfig = {
          ...config,
          clearCache: {
            enabled: false, // Don't clear cache by default
            scope: 'town' as const
          },
          incrementalUpdate: true, // Add this flag
        };

        const result = await buildDatabase({
          name: county.name,
          towns: [town]
        }, builderConfig);

        // Verify counts after processing each town
        await verifyAndFixRestaurantCount(county.name, town.name);

        processedTowns++;
        processedRestaurants += result.totalProcessed;

        results.push({
          county: county.name,
          town: town.name,
          processed: processedTowns,
          total: totalTowns,
          restaurants: processedRestaurants,
          stats: result
        });

      } catch (error) {
        console.error(`Error processing ${county.name} - ${town.name}:`, error);
        results.push({
          county: county.name,
          town: town.name,
          processed: processedTowns,
          total: totalTowns,
          restaurants: processedRestaurants,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  // Final verification of all processed areas
  for (const area of selectedAreas) {
    await verifyAndFixRestaurantCount(area.county.name, area.towns[0].name);
  }

  return results;
}