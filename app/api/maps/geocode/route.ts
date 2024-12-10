import { NextResponse } from "next/server";
import { 
  Client, 
  GeocodeRequest,
  Language, 
  AddressType,
  PlaceType2,
  GeocodingAddressComponentType
} from "@googlemaps/google-maps-services-js";
import { ReverseGeocodingLocationType } from "@googlemaps/google-maps-services-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

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
      const response = await client.reverseGeocode({
        params: {
          latlng: { lat: parseFloat(lat), lng: parseFloat(lng) },
          key: process.env.GOOGLE_MAPS_API_KEY!,
          language: Language.en,
          location_type: [ReverseGeocodingLocationType.ROOFTOP],
          result_type: [
            AddressType.street_address,
            AddressType.premise,
            AddressType.sublocality,
            AddressType.locality,
            AddressType.administrative_area_level_1,
            AddressType.administrative_area_level_2
          ]
        },
      });

      if (!response.data.results?.length) {
        return NextResponse.json(
          { error: 'No results found for these coordinates' },
          { status: 404 }
        );
      }

      const result = response.data.results[0];
      const components = result.address_components;

      // Extract detailed location information
      const locationInfo = {
        formattedAddress: result.formatted_address,
        location: result.geometry.location,
        county: components?.find(c => 
          c.types.includes(AddressType.administrative_area_level_2)
        )?.long_name || 'Unknown County',
        city: components?.find(c => 
          c.types.includes(AddressType.locality)
        )?.long_name,
        district: components?.find(c => 
          c.types.includes(AddressType.sublocality) || 
          c.types.includes(AddressType.sublocality_level_1)
        )?.long_name,
        streetAddress: components?.find(c => 
          c.types.includes(AddressType.street_address)
        )?.long_name,
        locationType: result.geometry.location_type,
        placeId: result.place_id
      };

      return NextResponse.json(locationInfo);
    }

    // Forward geocoding (address to coordinates)
    if (address) {
      const response = await client.geocode({
        params: {
          address,
          key: process.env.GOOGLE_MAPS_API_KEY!,
          language: Language.en,
          components: 'country:tw' // Restrict to Taiwan
        },
      });

      if (!response.data.results?.length) {
        return NextResponse.json(
          { error: 'No results found for this address' },
          { status: 404 }
        );
      }

      const result = response.data.results[0];
      const components = result.address_components;

      return NextResponse.json({
        formattedAddress: result.formatted_address,
        location: result.geometry.location,
        placeId: result.place_id,
        county: components?.find(c => 
          c.types.includes(AddressType.administrative_area_level_2)
        )?.long_name || 'Unknown County',
        locationType: result.geometry.location_type
      });
    }

  } catch (error) {
    console.error('Error in geocoding:', error);
    return NextResponse.json(
      { error: 'Failed to process geocoding request' },
      { status: 500 }
    );
  }
}