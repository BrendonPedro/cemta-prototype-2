// app/api/yelp/search/route.ts

import { NextResponse } from "next/server";
import axios from "axios";

interface YelpBusiness {
  id: string;
  name: string;
  image_url?: string;
  rating?: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  location?: {
    address1?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
  };
  distance?: number;
}

interface YelpSearchResponse {
  businesses: YelpBusiness[];
  total: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get("latitude");
    const longitude = searchParams.get("longitude");
    const limit = searchParams.get("limit") || "20";

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey) {
      console.error("Yelp API key is missing");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const response = await axios.get<YelpSearchResponse>(
      "https://api.yelp.com/v3/businesses/search",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        params: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: 40000,
          limit: parseInt(limit),
          categories: "restaurants,food",
          sort_by: "distance",
          locale: 'zh_TW'
        },
      }
    );

    const businesses = response.data.businesses?.map((business: YelpBusiness) => ({
      id: business.id,
      name: business.name,
      image_url: business.image_url,
      rating: business.rating,
      coordinates: business.coordinates,
      location: business.location,
      distance: business.distance
    })) || [];

    return NextResponse.json({
      businesses,
      total: response.data.total || 0
    });
  } catch (error) {
    console.error("Yelp search error:", error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.error?.description || 
                     error.response?.data?.error || 
                     "Failed to fetch from Yelp";
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}