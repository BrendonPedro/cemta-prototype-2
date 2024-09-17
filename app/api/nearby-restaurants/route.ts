import { NextResponse } from 'next/server';
import { Client, PlaceType1, PlacesNearbyRanking } from '@googlemaps/google-maps-services-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  try {
    const googleMapsClient = new Client({});
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      throw new Error('Google Maps API key is not set');
    }

    const response = await googleMapsClient.placesNearby({
      params: {
        location: { lat: parseFloat(lat), lng: parseFloat(lng) },
        rankby: PlacesNearbyRanking.distance,  // Using rankby instead of radius
        type: PlaceType1.restaurant,
        key: apiKey,
      },
    });

    console.log('Google Maps API Response:', JSON.stringify(response.data, null, 2));  // Detailed logging

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API returned status: ${response.data.status}`);
    }

    const nearbyRestaurants = response.data.results.slice(0, 10).map(place => ({
      id: place.place_id,
      name: place.name,
      location: place.vicinity,
      latitude: place.geometry?.location.lat,
      longitude: place.geometry?.location.lng,
    }));

    return NextResponse.json({ restaurants: nearbyRestaurants });
  } catch (error) {
    console.error('Error fetching nearby restaurants:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch nearby restaurants', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}