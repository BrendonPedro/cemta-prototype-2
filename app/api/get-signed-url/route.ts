// app/api/get-signed-url/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { auth } from '@/config/firebaseAdmin';

const storage = new Storage();
const bucket = storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET_ORIGINAL_MENUS!);

export async function GET(request: NextRequest) {
  try {
    // Verify Firebase ID token
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      await auth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get the filePath from the URL parameters
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');
    if (!filePath) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

   // Extract the file name from the full URL
    const fileName = filePath.split('/').pop();
    if (!fileName) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }

    const file = bucket.file(fileName);
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}