// app/api/maps/route.ts

import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Use the public key since this will be used client-side
    return NextResponse.json({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID
    });
  } catch (error) {
    console.error('Error fetching Maps API key:', error);
    return NextResponse.json(
      { error: 'Failed to get Maps API key' },
      { status: 500 }
    );
  }
}