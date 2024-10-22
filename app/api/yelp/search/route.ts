// app/api/yelp/search/route.ts

import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get("latitude");
    const longitude = searchParams.get("longitude");
    const radius = searchParams.get("radius") || "40000"; // Default 40km
    const limit = searchParams.get("limit") || "20"; // Get limit parameter

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Parse parameters to appropriate types
    const parsedLatitude = parseFloat(latitude);
    const parsedLongitude = parseFloat(longitude);
    const parsedRadius = parseInt(radius, 10);
    const parsedLimit = parseInt(limit, 10);

    const response = await axios.get(
      "https://api.yelp.com/v3/businesses/search",
      {
        headers: {
          Authorization: `Bearer ${process.env.YELP_API_KEY}`,
        },
        params: {
          latitude: parsedLatitude,
          longitude: parsedLongitude,
          radius: parsedRadius,
          limit: parsedLimit, // Use limit parameter
          categories: "restaurants", // Ensure only restaurants are returned
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Yelp search error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from Yelp" },
      { status: 500 }
    );
  }
}
