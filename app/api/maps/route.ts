// app/api/maps/route.ts

import { NextRequest, NextResponse } from "next/server";
import { mapsService } from "@/app/services/maps";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const operation = searchParams.get('operation');

  if (!operation) {
    return NextResponse.json({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID
    });
  }

  try {
    switch (operation) {
      case 'geocode': {
        const address = searchParams.get('address');
        if (!address) {
          return NextResponse.json({ error: 'Address is required' }, { status: 400 });
        }
        const result = await mapsService.geocode(address);
        return NextResponse.json(result);
      }
      
      case 'reverseGeocode': {
        const lat = parseFloat(searchParams.get('lat') || '');
        const lng = parseFloat(searchParams.get('lng') || '');
        if (isNaN(lat) || isNaN(lng)) {
          return NextResponse.json({ error: 'Valid coordinates are required' }, { status: 400 });
        }
        const result = await mapsService.reverseGeocode(lat, lng);
        return NextResponse.json(result);
      }
      
      case 'placeDetails': {
        const placeId = searchParams.get('placeId');
        if (!placeId) {
          return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
        }
        const result = await mapsService.getPlaceDetails(placeId);
        return NextResponse.json(result);
      }
      
      case 'searchNearby': {
        const lat = parseFloat(searchParams.get('lat') || '');
        const lng = parseFloat(searchParams.get('lng') || '');
        const radius = parseInt(searchParams.get('radius') || '1000');
        if (isNaN(lat) || isNaN(lng)) {
          return NextResponse.json({ error: 'Valid coordinates are required' }, { status: 400 });
        }
        const result = await mapsService.searchNearby({
          latitude: lat,
          longitude: lng,
          radius
        });
        return NextResponse.json(result);
      }
      
      default:
        return NextResponse.json({ error: 'Unknown operation' }, { status: 400 });
    }
  } catch (error) {
    console.error(`Error in maps API (${operation}):`, error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}