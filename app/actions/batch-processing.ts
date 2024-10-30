// app/actions/batch-processing.ts
'use server'

import { Storage } from '@google-cloud/storage';
import { processCounty } from '@/lib/database-builder';
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
  let processedTowns = 0;
  let processedRestaurants = 0;
  const totalTowns = selectedAreas.reduce((sum, area) => sum + area.towns.length, 0);

  const results = [];

  for (const area of selectedAreas) {
    const { county, towns } = area;

    for (const town of towns) {
      try {
        const result = await processCounty({
          name: county.name,
          towns: [town]
        }, {
          googleApiKey: process.env.GOOGLE_MAPS_API_KEY!,
          yelpApiKey: process.env.YELP_API_KEY!,
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS!
        });

        processedTowns++;
        processedRestaurants += result.totalProcessed;
        
        results.push({
          county: county.name,
          town: town.name,
          processed: processedTowns,
          total: totalTowns,
          restaurants: processedRestaurants
        });

      } catch (error) {
        console.error(`Error processing ${county.name} - ${town.name}:`, error);
      }

      // Add delay between processing
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return results;
}