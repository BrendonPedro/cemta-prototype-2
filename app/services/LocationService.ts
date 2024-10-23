// app/services/locationService.ts

import { db } from "@/config/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { 
  Client, 
  Language,
  AddressType,
  GeocodeResult 
} from "@googlemaps/google-maps-services-js";

interface LocationCache {
  county: string;
  timestamp: number;
  gridKey: string;
}

export class LocationService {
  private static instance: LocationService;
  private requestQueue: Map<string, Promise<string>>;
  private activeRequests: Set<string>;
  private CACHE_DURATION = 60 * 24 * 60 * 60 * 1000; // 60 days
  private GRID_SIZE = 0.02; // ~2km grid

  private constructor() {
    this.requestQueue = new Map();
    this.activeRequests = new Set();
  }

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  private calculateGridKey(lat: number, lng: number): string {
    const gridLat = Math.floor(lat / this.GRID_SIZE) * this.GRID_SIZE;
    const gridLng = Math.floor(lng / this.GRID_SIZE) * this.GRID_SIZE;
    return `${gridLat.toFixed(6)},${gridLng.toFixed(6)}`;
  }

  private async getCacheFromFirestore(gridKey: string): Promise<LocationCache | null> {
    const cacheRef = doc(db, 'locationCache', gridKey);
    const cacheDoc = await getDoc(cacheRef);

    if (cacheDoc.exists()) {
      const data = cacheDoc.data() as LocationCache;
      if (Date.now() - data.timestamp < this.CACHE_DURATION) {
        return data;
      }
    }
    return null;
  }

  private async saveToCache(gridKey: string, county: string): Promise<void> {
    const cacheData: LocationCache = {
      county,
      timestamp: Date.now(),
      gridKey,
    };

    await setDoc(doc(db, 'locationCache', gridKey), cacheData);
  }

  async getCountyName(lat: number, lng: number, apiKey: string): Promise<string> {
    const gridKey = this.calculateGridKey(lat, lng);

    // Check if request is in progress
    if (this.requestQueue.has(gridKey)) {
      return this.requestQueue.get(gridKey)!;
    }

    const countyPromise = this.processLocationRequest(lat, lng, gridKey, apiKey);
    this.requestQueue.set(gridKey, countyPromise);

    try {
      const result = await countyPromise;
      this.requestQueue.delete(gridKey);
      return result;
    } catch (error) {
      this.requestQueue.delete(gridKey);
      throw error;
    }
  }

  private async processLocationRequest(
    lat: number,
    lng: number,
    gridKey: string,
    apiKey: string
  ): Promise<string> {
    try {
      // Check cache
      const cachedData = await this.getCacheFromFirestore(gridKey);
      if (cachedData) {
        return cachedData.county;
      }

      // Make API request if not in cache
      if (!this.activeRequests.has(gridKey)) {
        this.activeRequests.add(gridKey);
        try {
          const county = await this.makeGoogleMapsRequest(lat, lng, apiKey);
          await this.saveToCache(gridKey, county);
          return county;
        } finally {
          this.activeRequests.delete(gridKey);
        }
      }

      return 'Unknown County';
    } catch (error) {
      console.error('Error in location service:', error);
      return 'Unknown County';
    }
  }

   private async makeGoogleMapsRequest(lat: number, lng: number, apiKey: string): Promise<string> {
    const client = new Client({});
    
    try {
      const response = await client.reverseGeocode({
        params: {
          latlng: { lat, lng },
          key: apiKey,
          language: Language.en,
          result_type: [AddressType.administrative_area_level_2]  // Fixed: Using result_type instead of types
        },
      });

      if (response.data.results?.length > 0) {
        const addressComponents = response.data.results[0].address_components;
        const countyComponent = addressComponents.find((component) =>
          component.types.includes(AddressType.administrative_area_level_2)
        );
        return countyComponent ? countyComponent.long_name : 'Unknown County';
      }
      
      return 'Unknown County';
    } catch (error) {
      console.error('Google Maps API error:', error);
      return 'Unknown County';
    }
  }
}