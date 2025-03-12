// app/api/maps/geocode/route.ts

import { NextResponse } from "next/server";
import { 
  Client, 
  Language, 
  AddressType,
} from "@googlemaps/google-maps-services-js";
import { counties, getNearbyTowns } from '@/lib/data/counties';
import { determineLocation } from "@/app/services/location/locationService";
// Import types from the centralized location
import type { Coordinates } from "@/app/services/location/type";

interface LocationStats {
  towns: Set<string>;
  counties: Set<string>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  const locationStats: LocationStats = {
    towns: new Set<string>(),
    counties: new Set<string>()
  };

  if (!address && (!lat || !lng)) {
    return NextResponse.json(
      { error: 'Either address or coordinates (lat/lng) are required' },
      { status: 400 }
    );
  }

  const client = new Client({});

  try {
    // Reverse geocoding (coordinates to address)
    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);

      console.log('\n=== Processing Location Request ===');
      console.log(`Coordinates: ${parsedLat}, ${parsedLng}`);
      console.log('💰 [COST] Making Google Maps Reverse Geocoding API call');

      // Validate coordinates
      if (isNaN(parsedLat) || isNaN(parsedLng) ||
          parsedLat < 21.9 || parsedLat > 25.3 ||
          parsedLng < 120.0 || parsedLng > 122.0) {
        console.log('❌ Coordinates outside Taiwan bounds');
        return NextResponse.json(
          { error: 'Coordinates outside Taiwan bounds' },
          { status: 400 }
        );
      }

      // First try using our local location service
      const localLocation = await determineLocation(parsedLat, parsedLng);
      
      // If we got valid local data, use it as a fallback
      const validLocalData = localLocation.county !== 'Unknown County' && 
                            localLocation.townName !== 'Unknown Town';

      // Then try Google's geocoding
      const response = await client.reverseGeocode({
        params: {
          latlng: { lat: parsedLat, lng: parsedLng },
          key: process.env.GOOGLE_MAPS_API_KEY!,
          language: Language.en,
          result_type: [
            AddressType.administrative_area_level_2,
            AddressType.locality,
            AddressType.sublocality_level_1
          ]
        },
      });

      console.log('\n=== Google Maps Response ===');
      if (response.data.results?.length) {
        const result = response.data.results[0];
        const components = result.address_components;

        let county = components?.find(c => 
          c.types.includes(AddressType.administrative_area_level_2)
        )?.long_name;

        let town = components?.find(c => 
          c.types.includes(AddressType.locality) ||
          c.types.includes(AddressType.sublocality_level_1)
        )?.long_name;

        console.log('Google Found County:', county);
        console.log('Google Found Town:', town);

        // If Google data is incomplete, try nearby towns
        if (!county || !town || county === 'Unknown County' || town === 'Unknown Town') {
          console.log('\n=== Checking Nearby Towns ===');
          const nearbyTowns = getNearbyTowns(parsedLat, parsedLng, 5);
          
          if (nearbyTowns.length > 0) {
            const matchedTown = nearbyTowns[0];
            console.log('Nearest Town:', matchedTown.name);
            console.log('In County:', matchedTown.countyName);
            
            // Use the nearest town data if Google data is missing or unknown
            county = county === 'Unknown County' ? matchedTown.countyName : county;
            town = town === 'Unknown Town' ? matchedTown.name : town;
          } else if (validLocalData) {
            // Fall back to our local data if no nearby towns found
            county = localLocation.county;
            town = localLocation.townName;
          }
        }

        // Update stats with final values
        if (county) locationStats.counties.add(county);
        if (town) locationStats.towns.add(town);

        const locationInfo = {
          formattedAddress: result.formatted_address,
          location: result.geometry.location,
          county: county || localLocation.county,
          townName: town || localLocation.townName,
          placeId: result.place_id,
          bounds: result.geometry.viewport,
          accuracy: result.geometry.location_type
        };

        // Log final stats
        console.log('\n=== Final Location Data ===');
        console.log('County:', locationInfo.county);
        console.log('Town:', locationInfo.townName);
        console.log('\n=== Location Coverage Statistics ===');
        console.log(`Total Unique Towns: ${locationStats.towns.size}`);
        console.log('Towns:', Array.from(locationStats.towns).join(', '));
        console.log(`Total Unique Counties: ${locationStats.counties.size}`);
        console.log('Counties:', Array.from(locationStats.counties).join(', '));
        console.log('===============================\n');

        return NextResponse.json(locationInfo);
      }

      // If Google geocoding fails, use our local data
      if (validLocalData) {
        return NextResponse.json({
          formattedAddress: `${localLocation.townName}, ${localLocation.county}, Taiwan`,
          location: { lat: parsedLat, lng: parsedLng },
          county: localLocation.county,
          townName: localLocation.townName,
          accuracy: 'APPROXIMATE'
        });
      }
    }

    // Handle forward geocoding (address to coordinates)
    if (address) {
      console.log('🌍 [COST] Making Google Maps Forward Geocoding API call');
      const response = await client.geocode({
        params: {
          address,
          key: process.env.GOOGLE_MAPS_API_KEY!,
          language: Language.en,
          components: 'country:tw'
        },
      });

      if (response.data.results?.length) {
        const result = response.data.results[0];
        const location = result.geometry.location;
        
        // Get local data for the coordinates
        const localLocation = await determineLocation(location.lat, location.lng);

        return NextResponse.json({
          ...result,
          county: localLocation.county,
          townName: localLocation.townName
        });
      }
    }

    return NextResponse.json(
      { error: 'No results found' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error in geocoding:', error);
    return NextResponse.json(
      { error: 'Failed to process geocoding request' },
      { status: 500 }
    );
  }
}