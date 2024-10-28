// scripts/run-database-builder.ts

import { processCounty, type CountyData } from '@/lib/database-builder';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const requiredEnvVars = [
  'GOOGLE_MAPS_API_KEY',
  'YELP_API_KEY',
  'GOOGLE_CLOUD_PROJECT_ID',
  'GOOGLE_APPLICATION_CREDENTIALS'
] as const;

// Verify environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const countyData: CountyData = {
  name: "Miaoli County",
  towns: [
    {
      name: "Miaoli City",
      location: { lat: 24.5701, lng: 120.8227 },
      searchRadiusKm: 5
    },
    {
      name: "Toufen",
      location: { lat: 24.6836, lng: 120.8878 },
      searchRadiusKm: 4
    },
    // Add other towns as needed
  ]
};

async function run() {
  try {
    console.log(`Starting database build for ${countyData.name}`);
    console.log(`Processing ${countyData.towns.length} towns...`);

    const stats = await processCounty(countyData, {
      googleApiKey: process.env.GOOGLE_MAPS_API_KEY!,
      yelpApiKey: process.env.YELP_API_KEY!,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS!
    });

    console.log('\nProcessing complete!');
    console.log('===================');
    console.log('Statistics:');
    console.log(`- Total Processed: ${stats.totalProcessed}`);
    console.log(`- Successful: ${stats.successful}`);
    console.log(`- Failed: ${stats.failed}`);
    console.log(`- Cached: ${stats.cached}`);
    console.log('\nAPI Calls:');
    console.log(`- Google: ${stats.apiCalls.google}`);
    console.log(`- Yelp: ${stats.apiCalls.yelp}`);
  } catch (error) {
    console.error('Error running database builder:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  run().catch(console.error);
}

export { run };