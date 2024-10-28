// app/api/database-builder/route.ts

import { NextResponse } from 'next/server';
import { processCounty } from '@/lib/database-builder';
import type { CountyData } from '@/lib/database-builder/types';

export async function POST(request: Request) {
  try {
    const countyData: CountyData = await request.json();

    // Verify authentication/authorization here
    
    const stats = await processCounty(countyData, {
      googleApiKey: process.env.GOOGLE_MAPS_API_KEY!,
      yelpApiKey: process.env.YELP_API_KEY!,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS!
    });

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error processing county:', error);
    return NextResponse.json(
      { error: 'Failed to process county' },
      { status: 500 }
    );
  }
}