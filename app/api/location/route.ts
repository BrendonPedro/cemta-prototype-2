// app/api/location/route.ts

import { NextResponse } from "next/server";
import { getLocationData } from "@/app/services/locationService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Latitude and longitude are required" },
      { status: 400 }
    );
  }

  try {
    const data = await getLocationData(
      parseFloat(lat),
      parseFloat(lng),
      process.env.GOOGLE_MAPS_API_KEY!
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting location data:', error);
    return NextResponse.json(
      { error: 'Failed to get location data' },
      { status: 500 }
    );
  }
}