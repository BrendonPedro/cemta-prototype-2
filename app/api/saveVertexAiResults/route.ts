// app/api/saveVertexAiResults/route.ts

import { NextRequest, NextResponse } from 'next/server';
import admin from '@/config/firebaseAdmin';
import { saveVertexAiResults } from '@/app/services/firebaseFirestore.server';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    const { menuData, menuId, restaurantId, menuName, imageUrl } = await req.json();

    // Check for missing fields
    const missingFields = [];
    if (!menuData) missingFields.push('menuData');
    if (!menuId) missingFields.push('menuId');
    if (!restaurantId) missingFields.push('restaurantId');
    if (!menuName) missingFields.push('menuName');
    if (!imageUrl) missingFields.push('imageUrl');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Call the server-side function to save the data
    await saveVertexAiResults(decodedToken.uid, menuData, menuId, restaurantId, menuName, imageUrl);

    console.log("Menu data saved successfully:", menuId);

    return NextResponse.json({ message: 'Menu data saved successfully', menuId }, { status: 200 });
  } catch (error: any) {
    console.error('Error saving menu data:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
