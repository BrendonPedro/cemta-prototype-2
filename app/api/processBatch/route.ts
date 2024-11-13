// app/api/processBatch/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { processBatchServer } from '@/app/actions/batch-processing';
import { auth } from '@/config/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
      await auth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { areas, options } = await request.json();
    const result = await processBatchServer(areas, {
      incrementalUpdate: true,
      ...options
    });
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error in processBatch:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}