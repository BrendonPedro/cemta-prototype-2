// app/services/yelpService.ts

import { db } from "@/config/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import axios from 'axios';
import { YelpBusiness } from '@/app/services/firebaseFirestore';

interface YelpCache {
  data: YelpBusiness;
  timestamp: number;
}

const CACHE_DURATION = 365 * 24 * 60 * 60 * 1000; // 365 days in milliseconds

async function getCachedYelpBusiness(
  name: string, 
  latitude: number, 
  longitude: number
): Promise<YelpBusiness | null> {
  try {
    const lat = Number(latitude);
    const lng = Number(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      console.error('Invalid coordinates provided to getCachedYelpBusiness');
      return null;
    }
    
    const cacheKey = `yelp_${name}_${lat.toFixed(3)}_${lng.toFixed(3)}`;
    const cacheRef = doc(db, "yelpCache", cacheKey);
    const cacheDoc = await getDoc(cacheRef);

    if (cacheDoc.exists()) {
      const cache = cacheDoc.data() as YelpCache;
      if (Date.now() - cache.timestamp < CACHE_DURATION) {
        return cache.data;
      }
    }
    return null;
  } catch (error) {
    console.error('Error in getCachedYelpBusiness:', error);
    return null;
  }
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

// For client-side calls
export async function getYelpBusinessWithPhotos(
  name: string,
  latitude: number | undefined,
  longitude: number | undefined
): Promise<YelpBusiness | null> {
  try {
    if (!name || typeof latitude === 'undefined' || typeof longitude === 'undefined') {
      console.error('Missing required parameters for getYelpBusinessWithPhotos');
      return null;
    }

    // Check cache first
    const cachedData = await getCachedYelpBusiness(name, latitude, longitude);
    if (cachedData) {
      return cachedData;
    }

    // If not in cache, fetch from our API route
    const response = await fetch(
      `/api/yelp?name=${encodeURIComponent(name)}&latitude=${latitude}&longitude=${longitude}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from Yelp API route');
    }

    const business = await response.json();
    
    if (business) {
      await cacheYelpBusiness(name, latitude, longitude, business);
      return business;
    }

    return null;
  } catch (error) {
    console.error('Error in getYelpBusinessWithPhotos:', error);
    return null;
  }
}

// For server-side direct API calls
export async function fetchYelpBusinessDirectly(
  name: string,
  latitude: number,
  longitude: number
): Promise<YelpBusiness | null> {
  try {
    if (!process.env.YELP_API_KEY) {
      console.error("Server-side Yelp API key is missing");
      return null;
    }

    // Normalize search term
    const normalizedName = name
      .trim()
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, '')
      .slice(0, 64);

    const response = await axios.get<{ businesses: YelpBusiness[] }>(
      "https://api.yelp.com/v3/businesses/search",
      {
        headers: {
          Authorization: `Bearer ${process.env.YELP_API_KEY}`,
          Accept: "application/json",
        },
        params: {
          term: normalizedName,
          latitude,
          longitude,
          radius: 100,
          categories: "restaurants,food",
          limit: 3,
          sort_by: "distance",
          locale: 'zh_TW',
        },
      }
    );

    if (!response.data?.businesses?.length) {
      return null;
    }

    // Find best match
    const bestMatch = response.data.businesses.find(business => {
      const businessName = business.name.toLowerCase();
      const searchName = normalizedName.toLowerCase();
      return businessName.includes(searchName) || searchName.includes(businessName);
    }) || response.data.businesses[0];

    return bestMatch;
  } catch (error) {
    console.error('Error fetching Yelp business directly:', error);
    return null;
  }
}

export async function fetchYelpBusinessDetailsDirectly(
  yelpId: string
): Promise<YelpBusiness | null> {
  try {
    if (!process.env.YELP_API_KEY) {
      console.error("Server-side Yelp API key is missing");
      return null;
    }

    const response = await axios.get<YelpBusiness>(
      `https://api.yelp.com/v3/businesses/${encodeURIComponent(yelpId)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.YELP_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    return response.data || null;
  } catch (error) {
    console.error('Error fetching Yelp business details:', error);
    return null;
  }
}