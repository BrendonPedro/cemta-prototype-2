// app/actions/batch-processing.ts
'use server'

import { buildDatabase, processBatch } from '@/lib/database-builder/core/builder';
import { auth } from '@/config/firebaseAdmin';
import type { EnhancedCountyData, EnhancedTownData } from '@/lib/data/counties';

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
  }[]
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
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
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
        
        const result = await buildDatabase({
          name: county.name,
          towns: [town]
        }, config);

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

      // Add delay between towns
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return results;
}