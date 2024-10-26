// app/api/maps/route.ts

import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      apiKey: process.env.GOOGLE_MAPS_API_KEY
    });
  } catch (error) {
    console.error('Error fetching Maps API key:', error);
    return NextResponse.json(
      { error: 'Failed to get Maps API key' },
      { status: 500 }
    );
  }
}