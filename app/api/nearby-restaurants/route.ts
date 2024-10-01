// /app/api/nearby-restaurants/route.ts

import { NextResponse } from 'next/server'; 
import { Client, PlaceType1, PlacesNearbyRanking } from '@googlemaps/google-maps-services-js';
import { getCachedRestaurantsForLocation, saveCachedRestaurantsForLocation } from '@/app/services/firebaseFirestore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const limit = searchParams.get('limit') || '20';

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  try {
    console.log(`Received request for lat: ${lat}, lng: ${lng}`);

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    // Check if cached data exists
    const cachedRestaurants = await getCachedRestaurantsForLocation(parsedLat, parsedLng);

    if (cachedRestaurants) {
      console.log('Serving cached data.');
      return NextResponse.json({ restaurants: cachedRestaurants });
    }

    console.log('No cached data found. Fetching from Google Maps API.');

    const googleMapsClient = new Client({});
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      throw new Error('Google Maps API key is not set');
    }

    const response = await googleMapsClient.placesNearby({
      params: {
        location: { lat: parsedLat, lng: parsedLng },
        rankby: PlacesNearbyRanking.distance,
        type: PlaceType1.restaurant,
        key: apiKey,
      },
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API returned status: ${response.data.status}`);
    }

    const nearbyRestaurants = response.data.results.slice(0, parseInt(limit)).map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      latitude: place.geometry?.location.lat,
      longitude: place.geometry?.location.lng,
      rating: place.rating || 0,
    }));

    // Save to cache
    await saveCachedRestaurantsForLocation(parsedLat, parsedLng, nearbyRestaurants);

    console.log('Saved new data to cache.');

    return NextResponse.json({ restaurants: nearbyRestaurants });
  } catch (error) {
    console.error('Error fetching nearby restaurants:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch nearby restaurants', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
