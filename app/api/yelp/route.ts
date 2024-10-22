// app/api/yelp/route.ts

import { NextResponse } from "next/server";
import axios from "axios";

interface YelpCategory {
  alias: string;
  title: string;
}

interface YelpBusiness {
  id: string;
  name: string;
  categories: YelpCategory[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  location: {
    address1: string;
    city: string;
    state: string;
    country: string;
  };
  rating: number;
  photos?: string[];
}

interface YelpSearchResponse {
  businesses: YelpBusiness[];
  total: number;
  region: {
    center: {
      latitude: number;
      longitude: number;
    };
  };
}

// List of convenience store chains and establishments to exclude
const EXCLUDED_ESTABLISHMENTS = [
  'family mart',
  'familymart',
  '7-eleven',
  '7-11',
  'seven eleven',
  'hi-life',
  'hi life',
  'hilife',
  'ok mart',
  'okmart',
  'simple mart',
  'simplemart',
  'mini stop',
  'ministop',
  '全家',  // Family Mart in Chinese
  '7-11',
  '萊爾富',  // Hi-Life in Chinese
  '便利商店', // Convenience store in Chinese
  'convenience store',
  '超商',  // Convenience store abbreviated in Chinese
];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    const latitude = url.searchParams.get("latitude");
    const longitude = url.searchParams.get("longitude");

    if (!name || !latitude || !longitude) {
      return NextResponse.json(
        { error: "Name, latitude, and longitude are required" },
        { status: 400 }
      );
    }

    // Check if the name matches any excluded establishments
    const normalizedName = name.toLowerCase().trim();
    if (EXCLUDED_ESTABLISHMENTS.some(excluded => 
      normalizedName.includes(excluded.toLowerCase()) || 
      excluded.toLowerCase().includes(normalizedName)
    )) {
      console.log(`Skipping excluded establishment: ${name}`);
      return NextResponse.json(null);
    }

    const response = await axios.get<YelpSearchResponse>(
      "https://api.yelp.com/v3/businesses/search",
      {
        headers: {
          Authorization: `Bearer ${process.env.YELP_API_KEY}`,
          Accept: "application/json",
        },
        params: {
          term: name,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: 100,
          categories: "restaurants,food",
          categories_not: "convenience,convenience_stores,conveniencestore,food_court",
          limit: 3,
          sort_by: "distance"
        },
      }
    );

    const businesses = response.data.businesses || [];
    
    // Additional filter to ensure no convenience stores slip through
    const filteredBusinesses = businesses.filter((business: YelpBusiness) => {
      const businessName = business.name.toLowerCase();
      const hasExcludedName = EXCLUDED_ESTABLISHMENTS.some(excluded => 
        businessName.includes(excluded.toLowerCase())
      );
      
      // Check categories to exclude convenience stores
      const hasConvenienceCategory = business.categories?.some((category: YelpCategory) => 
        category.alias.includes('convenience') || 
        category.title.toLowerCase().includes('convenience')
      );

      return !hasExcludedName && !hasConvenienceCategory;
    });

    // Find best match from filtered results
    const bestMatch = filteredBusinesses.find((business: YelpBusiness) => {
      const normalizedSearchName = name.toLowerCase().replace(/\s+/g, '');
      const normalizedBusinessName = business.name.toLowerCase().replace(/\s+/g, '');
      
      return (
        normalizedBusinessName.includes(normalizedSearchName) ||
        normalizedSearchName.includes(normalizedBusinessName) ||
        (Math.abs(normalizedBusinessName.length - normalizedSearchName.length) <= 3 &&
          (normalizedBusinessName.includes(normalizedSearchName.substring(0, 5)) ||
           normalizedSearchName.includes(normalizedBusinessName.substring(0, 5))))
      );
    }) || filteredBusinesses[0];

    return NextResponse.json(bestMatch || null);
  } catch (error) {
    console.error("Yelp API error:", error);
    return NextResponse.json(null);
  }
}