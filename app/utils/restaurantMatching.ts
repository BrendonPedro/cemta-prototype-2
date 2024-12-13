// app/utils/restaurantMatching.ts

import { Restaurant } from "@/interfaces/restaurant/types";
import { YelpBusiness } from "@/interfaces/restaurant/types";
import { calculateDistance } from "@/app/utils/locationUtils";

interface LocationMatch {
    distance: number;
    nameScore: number;
    totalScore: number;
  }
  
  export function calculateMatchScore(
    googlePlace: Restaurant,
    yelpBusiness: YelpBusiness
  ): LocationMatch {
    // Calculate distance between coordinates
    const distance = calculateDistance(
      googlePlace.latitude,
      googlePlace.longitude,
      yelpBusiness.coordinates.latitude,
      yelpBusiness.coordinates.longitude
    );
  
    // Calculate name similarity (simple for now)
    const normalizedGoogleName = googlePlace.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedYelpName = yelpBusiness.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Calculate Levenshtein distance or similar name matching score
    const nameScore = normalizedGoogleName.includes(normalizedYelpName) || 
                     normalizedYelpName.includes(normalizedGoogleName) ? 1 : 0;
  
    // Total score weighted by importance
    const totalScore = (nameScore * 0.7) + (distance < 50 ? 0.3 : 0);
  
    return {
      distance,
      nameScore,
      totalScore
    };
  }