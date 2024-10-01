// /app/api/upload-to-gcs/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { unlabeledBucket } from '@/config/googleCloudConfig';
import admin from '@/config/firebaseAdmin';
import { DecodedIdToken } from 'firebase-admin/auth';
import Busboy from 'busboy';

export async function POST(req: NextRequest) {
  return new Promise<NextResponse>(async (resolve, reject) => {
    try {
      // Authentication
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('Missing or invalid authorization header');
        return resolve(NextResponse.json({ message: 'Unauthorized' }, { status: 401 }));
      }

      const token = authHeader.split('Bearer ')[1];
      let decodedToken: DecodedIdToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(token);
        console.log('Token verified:', decodedToken);
      } catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        return resolve(NextResponse.json({ message: 'Invalid token', error: getErrorMessage(error) }, { status: 401 }));
      }

      // Convert Headers to Plain Object
      const headersObj: { [key: string]: string } = {};
      req.headers.forEach((value, key) => {
        headersObj[key.toLowerCase()] = value;
      });

      // Handle file upload
      const bb = Busboy({ headers: headersObj });
      const fileWritePromises: Promise<void>[] = [];
      let fileUploaded = false;
      let fileUrl = '';

      bb.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
        const { filename, mimeType } = info;
        const fileName = `${Date.now()}-${decodedToken.uid}-${filename}`;
        const fileStream = unlabeledBucket.file(fileName).createWriteStream({
          resumable: false,
          contentType: mimeType,
        });

        file.pipe(fileStream);

        fileStream.on('finish', () => {
          fileUploaded = true;
          fileUrl = `https://storage.googleapis.com/${unlabeledBucket.name}/${fileName}`;
        });

        fileWritePromises.push(
          new Promise((resolve, reject) => {
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
          })
        );
      });

      bb.on('finish', async () => {
        try {
          await Promise.all(fileWritePromises);
          if (!fileUploaded) {
            return resolve(NextResponse.json({ message: 'No file uploaded' }, { status: 400 }));
          }
          resolve(NextResponse.json({ url: fileUrl }, { status: 200 }));
        } catch (error) {
          console.error('Error during file upload:', error);
          resolve(NextResponse.json({ message: 'File upload failed', error: getErrorMessage(error) }, { status: 500 }));
        }
      });

      const reader = req.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bb.write(value);
        }
        bb.end();
      } else {
        resolve(NextResponse.json({ message: 'Failed to get reader from request body' }, { status: 400 }));
      }
    } catch (error) {
      console.error('Internal server error:', error);
      resolve(NextResponse.json({ message: 'Internal server error', error: getErrorMessage(error) }, { status: 500 }));
    }
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}




