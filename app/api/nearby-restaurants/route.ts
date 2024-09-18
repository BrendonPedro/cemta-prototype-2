import { NextResponse } from 'next/server';
import { Client, PlaceType1, PlacesNearbyRanking } from '@googlemaps/google-maps-services-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const limit = searchParams.get('limit') || '20';

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  try {
    const googleMapsClient = new Client({});
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      throw new Error('Google Maps API key is not set');
    }

    console.log(`Fetching restaurants for lat: ${lat}, lng: ${lng}, limit: ${limit}`);

    const response = await googleMapsClient.placesNearby({
      params: {
        location: { lat: parseFloat(lat), lng: parseFloat(lng) },
        rankby: PlacesNearbyRanking.distance,
        type: PlaceType1.restaurant,
        key: apiKey,
      },
    });

    console.log('Google Maps API Response Status:', response.data.status);
    console.log('Number of results:', response.data.results.length);

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API returned status: ${response.data.status}`);
    }

    const nearbyRestaurants = response.data.results.slice(0, parseInt(limit)).map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      latitude: place.geometry?.location.lat,
      longitude: place.geometry?.location.lng,
      rating: place.rating || 0, // Added rating here with a fallback to 0
    }));

    console.log(`Returning ${nearbyRestaurants.length} restaurants`);

    return NextResponse.json({ restaurants: nearbyRestaurants });
  } catch (error) {
    console.error('Error fetching nearby restaurants:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch nearby restaurants', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
