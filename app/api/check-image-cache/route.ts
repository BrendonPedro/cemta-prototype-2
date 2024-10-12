// app/api/check-image-cache/route.ts

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/config/firebaseAdmin';
import { getCachedImageUrl } from '@/app/services/firebaseFirestore';

export async function POST(req: NextRequest) {
  try {
    // Authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const { fileName } = await req.json();

    if (!fileName) {
      return NextResponse.json({ message: 'Missing fileName' }, { status: 400 });
    }

    const cachedUrl = await getCachedImageUrl(decodedToken.uid, fileName);

    if (cachedUrl) {
      return NextResponse.json({ exists: true, url: cachedUrl });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking image cache:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}