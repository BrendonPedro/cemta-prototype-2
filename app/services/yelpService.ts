// app/services/yelpService.ts

import axios from 'axios';

interface YelpBusiness {
  id: string;
  name: string;
  photos: string[];
  rating: number;
  location: {
    address1: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  categories: {
    alias: string;
    title: string;
  }[];
}

export async function fetchYelpBusinessDirectly(
  name: string,
  latitude: number,
  longitude: number
): Promise<YelpBusiness | null> {
  try {
    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey) {
      console.error("Yelp API key is missing");
      return null;
    }

    // Search for the business
    const response = await axios.get<{ businesses: YelpBusiness[] }>(
      "https://api.yelp.com/v3/businesses/search",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        params: {
          term: name,
          latitude,
          longitude,
          radius: 100,
          categories: "restaurants,food",
          limit: 3,
          sort_by: "distance",
        },
      }
    );

    const businesses = response.data.businesses || [];
    const business = businesses[0];

    return business || null;
  } catch (error) {
    console.error("Error fetching Yelp business directly:", error);
    return null;
  }
}

export async function fetchYelpBusinessDetailsDirectly(
  yelpId: string
): Promise<YelpBusiness | null> {
  try {
    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey) {
      console.error("Yelp API key is missing");
      return null;
    }

    const response = await axios.get<YelpBusiness>(
      `https://api.yelp.com/v3/businesses/${encodeURIComponent(yelpId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      }
    );

    return response.data || null;
  } catch (error) {
    console.error("Error fetching Yelp business details directly:", error);
    return null;
  }
}

export async function searchYelpBusiness(
  name: string,
  latitude: number,
  longitude: number
): Promise<YelpBusiness | null> {
  if (typeof window === 'undefined') {
    // Server-side code: Call Yelp API directly
    return await fetchYelpBusinessDirectly(name, latitude, longitude);
  } else {
    // Client-side code: Call API route
    try {
      const params = new URLSearchParams({
        name,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
      });

      const response = await fetch(`/api/yelp?${params.toString()}`);

      if (!response.ok) {
        console.warn(`Yelp API request failed for ${name}`);
        return null;
      }

      const data = await response.json();
      return data.error ? null : data;
    } catch (error) {
      console.warn("Error searching Yelp:", error);
      return null;
    }
  }
}

export async function getYelpBusinessPhotos(
  yelpId: string
): Promise<string[] | null> {
  if (typeof window === 'undefined') {
    // Server-side code: Call Yelp API directly
    const business = await fetchYelpBusinessDetailsDirectly(yelpId);
    return business?.photos || null;
  } else {
    // Client-side code: Call API route
    try {
      const response = await fetch(`/api/yelp/business/${encodeURIComponent(yelpId)}`);
      if (!response.ok) {
        console.error("Failed to fetch Yelp business details");
        return null;
      }

      const data: YelpBusiness = await response.json();
      return data.photos || null;
    } catch (error) {
      console.error("Error fetching Yelp photos:", error);
      return null;
    }
  }
}
