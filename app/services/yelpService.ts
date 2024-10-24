// app/services/yelpService.ts
import { db } from "@/config/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import axios from 'axios';
import { YelpBusiness } from './firebaseFirestore';

interface YelpCache {
  data: YelpBusiness;
  timestamp: number;
}

const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

async function getCachedYelpBusiness(
  name: string, 
  latitude: number, 
  longitude: number
): Promise<YelpBusiness | null> {
  const cacheKey = `yelp_${name}_${latitude.toFixed(3)}_${longitude.toFixed(3)}`;
  const cacheRef = doc(db, "yelpCache", cacheKey);
  const cacheDoc = await getDoc(cacheRef);

  if (cacheDoc.exists()) {
    const cache = cacheDoc.data() as YelpCache;
    if (Date.now() - cache.timestamp < CACHE_DURATION) {
      return cache.data;
    }
  }
  return null;
}

async function cacheYelpBusiness(
  name: string,
  latitude: number,
  longitude: number,
  data: YelpBusiness
): Promise<void> {
  const cacheKey = `yelp_${name}_${latitude.toFixed(3)}_${longitude.toFixed(3)}`;
  const cacheRef = doc(db, "yelpCache", cacheKey);
  await setDoc(cacheRef, {
    data,
    timestamp: Date.now()
  });
}

export async function getYelpBusinessWithPhotos(
  name: string,
  latitude: number,
  longitude: number
): Promise<YelpBusiness | null> {
  // Check cache first
  const cachedData = await getCachedYelpBusiness(name, latitude, longitude);
  if (cachedData) {
    return cachedData;
  }

  // If not in cache, fetch from API
  const business = await fetchYelpBusinessDirectly(name, latitude, longitude);
  if (business?.id) {
    const details = await fetchYelpBusinessDetailsDirectly(business.id);
    const combinedData = {
      ...business,
      ...details
    } as YelpBusiness;
    
    // Cache the result
    await cacheYelpBusiness(name, latitude, longitude, combinedData);
    return combinedData;
  }
  return null;
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


