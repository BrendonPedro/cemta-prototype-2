// app/api/database-builder/route.ts

import { NextResponse } from 'next/server';
import { processCounty } from '@/lib/database-builder';
import type { CountyData } from '@/lib/database-builder/types';

// Helper to validate environment variables
function validateEnvironment() {
  const requiredVars = [
    'GOOGLE_MAPS_API_KEY',
    'YELP_API_KEY',
    'GOOGLE_CLOUD_PROJECT_ID',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GOOGLE_CLOUD_STORAGE_BUCKET'
  ] as const;

  const missing = requiredVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY!,
    yelpApiKey: process.env.YELP_API_KEY!,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS!,
    storageBucket: process.env.GOOGLE_CLOUD_STORAGE_BUCKET!
  };
}

// Helper to validate request body
function validateCountyData(data: any): data is CountyData {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  if (typeof data.name !== 'string' || !data.name) {
    throw new Error('County name is required');
  }

  if (!Array.isArray(data.towns) || data.towns.length === 0) {
    throw new Error('At least one town is required');
  }

  for (const town of data.towns) {
    if (typeof town.name !== 'string' || !town.name) {
      throw new Error('Town name is required');
    }

    if (!town.location || 
        typeof town.location.lat !== 'number' || 
        typeof town.location.lng !== 'number') {
      throw new Error('Valid town location is required');
    }

    if (typeof town.searchRadiusKm !== 'number' || town.searchRadiusKm <= 0) {
      throw new Error('Valid search radius is required');
    }
  }

  return true;
}

export async function POST(request: Request) {
  try {
    // Validate environment first
    const config = validateEnvironment();

    // Parse and validate request body
    const countyData = await request.json();
    if (!validateCountyData(countyData)) {
      return NextResponse.json(
        { error: 'Invalid county data format' },
        { status: 400 }
      );
    }

    // TODO: Add authentication check here
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.role === 'admin') {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    console.log(`Starting processing for ${countyData.name} with ${countyData.towns.length} towns`);

    const stats = await processCounty(countyData, config);

    console.log(`Completed processing for ${countyData.name}`, stats);

    return NextResponse.json({
      success: true,
      data: {
        countyName: countyData.name,
        stats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in database builder API:', error);

    // Determine appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('Missing required environment')) {
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      if (error.message.includes('Invalid') || error.message.includes('required')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    // Default error response
    return NextResponse.json(
      { 
        error: 'Failed to process county',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET endpoint to check processing status
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countyName = searchParams.get('county');

  if (!countyName) {
    return NextResponse.json(
      { error: 'County name is required' },
      { status: 400 }
    );
  }

  try {
    // TODO: Implement status checking logic here
    // const status = await checkProcessingStatus(countyName);
    
    return NextResponse.json({
      success: true,
      data: {
        countyName,
        status: 'Not implemented yet'
      }
    });

  } catch (error) {
    console.error('Error checking processing status:', error);
    return NextResponse.json(
      { error: 'Failed to check processing status' },
      { status: 500 }
    );
  }
}