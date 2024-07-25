import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import admin from '@/config/firebaseAdmin';

const storage = new Storage();
const bucket = storage.bucket('cemta_menu_uploads');

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await admin.auth().verifyIdToken(token);

    const contentType = req.headers.get('content-type');
    if (!contentType) {
      return NextResponse.json({ message: 'Content-Type is missing' }, { status: 400 });
    }

    const fileName = `${Date.now()}`;
    const file = bucket.file(fileName);
    const stream = file.createWriteStream({
      resumable: false,
      contentType,
    });

    const buffer: Uint8Array[] = [];
    const reader = req.body?.getReader();

    if (!reader) {
      return NextResponse.json({ message: 'Failed to get reader from request body' }, { status: 400 });
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        buffer.push(value);
      }
    }

    stream.on('error', (error) => {
      console.error('Error uploading file:', error);
      return NextResponse.json({ message: 'Error uploading file', error }, { status: 500 });
    });

    stream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      return NextResponse.json({ url: publicUrl }, { status: 200 });
    });

    stream.end(Buffer.concat(buffer));
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ message: 'Internal server error', error }, { status: 500 });
  }
}
