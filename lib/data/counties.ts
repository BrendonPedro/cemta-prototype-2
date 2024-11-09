// lib/data/counties.ts

import { CountyData } from "@/lib/database-builder/types";

// Define region type for geographical grouping
export type Region = 'NORTHERN' | 'CENTRAL' | 'SOUTHERN' | 'EASTERN' | 'OUTLYING';

// Enhanced town data interface with additional metadata
export interface EnhancedTownData {
  name: string;
  chineseName: string;
  location: { lat: number; lng: number };
  searchRadiusKm: number;
  population?: number;
}

// Enhanced county data interface with additional metadata
export interface EnhancedCountyData extends Omit<CountyData, 'towns'> {
  name: string;
  chineseName: string;
  population: number;
  area: number; // in km²
  density: number; // population per km²
  towns: EnhancedTownData[];
}

// ==================== Regional Definitions ====================
// Define geographical regions and their constituent counties
export const REGIONS: Record<Region, string[]> = {
  NORTHERN: ["Taipei City", "New Taipei City", "Keelung City", "Taoyuan City", "Hsinchu City", "Hsinchu County"],
  CENTRAL: ["Miaoli County", "Taichung City", "Changhua County", "Yunlin County"],
  SOUTHERN: ["Chiayi City", "Chiayi County", "Tainan City", "Kaohsiung City"],
  EASTERN: ["Hualien County", "Taitung County"],
  OUTLYING: ["Penghu County", "Kinmen County"]
};

// ==================== County Data ====================
export const counties: EnhancedCountyData[] = [
  // -------------------- Northern Taiwan --------------------
  {
    name: "Taipei City",
    chineseName: "臺北市",
    population: 2602418,
    area: 271.8,
    density: 9575,
    towns: [
      {
        name: "Daan District",
        chineseName: "大安區",
        location: { lat: 25.0268, lng: 121.5425 },
        searchRadiusKm: 3,
        population: 309835
      },
      {
        name: "Songshan District",
        chineseName: "松山區",
        location: { lat: 25.0505, lng: 121.5571 },
        searchRadiusKm: 3,
        population: 209689
      },
      {
        name: "Xinyi District",
        chineseName: "信義區",
        location: { lat: 25.0331, lng: 121.5715 },
        searchRadiusKm: 3,
        population: 225561
      },
      {
        name: "Zhongshan District",
        chineseName: "中山區",
        location: { lat: 25.0697, lng: 121.5381 },
        searchRadiusKm: 3,
        population: 230710
      }
    ]
  },
  {
    name: "New Taipei City",
    chineseName: "新北市",
    population: 4008113,
    area: 2052.57,
    density: 1953,
    towns: [
      {
        name: "Banqiao District",
        chineseName: "板橋區",
        location: { lat: 25.0143, lng: 121.4669 },
        searchRadiusKm: 4,
        population: 551452
      },
      {
        name: "Sanchong District",
        chineseName: "三重區",
        location: { lat: 25.0628, lng: 121.4888 },
        searchRadiusKm: 4,
        population: 387484
      },
      {
        name: "Zhonghe District",
        chineseName: "中和區",
        location: { lat: 24.9993, lng: 121.4934 },
        searchRadiusKm: 4,
        population: 413291
      }
    ]
  },
  {
    name: "Taoyuan City",
    chineseName: "桃園市",
    population: 2268807,
    area: 1221,
    density: 1857,
    towns: [
      {
        name: "Taoyuan District",
        chineseName: "桃園區",
        location: { lat: 24.9894, lng: 121.3111 },
        searchRadiusKm: 4,
        population: 448435
      },
      {
        name: "Zhongli District",
        chineseName: "中壢區",
        location: { lat: 24.9656, lng: 121.2168 },
        searchRadiusKm: 4,
        population: 405216
      }
    ]
  },
  {
    name: "Keelung City",
    chineseName: "基隆市",
    population: 371878,
    area: 132.76,
    density: 2801,
    towns: [
      {
        name: "Ren'ai District",
        chineseName: "仁愛區",
        location: { lat: 25.1277, lng: 121.7414 },
        searchRadiusKm: 3,
        population: 43633
      },
      {
        name: "Xinyi District",
        chineseName: "信義區",
        location: { lat: 25.1277, lng: 121.7414 },
        searchRadiusKm: 3,
        population: 51395
      },
      {
        name: "Zhongzheng District",
        chineseName: "中正區",
        location: { lat: 25.1437, lng: 121.7837 },
        searchRadiusKm: 3,
        population: 52918
      }
    ]
  },
  {
    name: "Hsinchu City",
    chineseName: "新竹市",
    population: 449865,
    area: 104.15,
    density: 4319,
    towns: [
      {
        name: "East District",
        chineseName: "東區",
        location: { lat: 24.8138, lng: 120.9767 },
        searchRadiusKm: 3,
        population: 207223
      },
      {
        name: "North District",
        chineseName: "北區",
        location: { lat: 24.8226, lng: 120.9478 },
        searchRadiusKm: 3,
        population: 147613
      },
      {
        name: "Xiangshan District",
        chineseName: "香山區",
        location: { lat: 24.7689, lng: 120.9139 },
        searchRadiusKm: 3,
        population: 77283
      }
    ]
  },
  {
    name: "Hsinchu County",
    chineseName: "新竹縣",
    population: 563976,
    area: 1427.59,
    density: 395,
    towns: [
      {
        name: "Zhubei City",
        chineseName: "竹北市",
        location: { lat: 24.8397, lng: 121.0132 },
        searchRadiusKm: 4,
        population: 198897
      },
      {
        name: "Hukou Township",
        chineseName: "湖口鄉",
        location: { lat: 24.9029, lng: 121.0444 },
        searchRadiusKm: 4,
        population: 78918
      },
      {
        name: "Xinfeng Township",
        chineseName: "新豐鄉",
        location: { lat: 24.9069, lng: 120.9956 },
        searchRadiusKm: 4,
        population: 56794
      },
      {
        name: "Guanxi Township",
        chineseName: "關西鎮",
        location: { lat: 24.7866, lng: 121.1766 },
        searchRadiusKm: 4,
        population: 28927
      },
      {
        name: "Baoshan Township",
        chineseName: "寶山鄉",
        location: { lat: 24.7609, lng: 120.9984 },
        searchRadiusKm: 4,
        population: 14935
      }
    ]
  },

  // -------------------- Central Taiwan --------------------
  {
    name: "Miaoli County",
    chineseName: "苗栗縣",
    population: 546593,
    area: 1820.31,
    density: 300,
    towns: [
      {
        name: "Miaoli City",
        chineseName: "苗栗市",
        location: { lat: 24.5701, lng: 120.8227 },
        searchRadiusKm: 4,
        population: 87464
      },
      {
        name: "Toufen",
        chineseName: "頭份市",
        location: { lat: 24.6836, lng: 120.8878 },
        searchRadiusKm: 4,
        population: 104489
      },
      {
        name: "Zhunan",
        chineseName: "竹南鎮",
        location: { lat: 24.6853, lng: 120.8511 },
        searchRadiusKm: 4,
        population: 86798
      }
    ]
  },
  {
    name: "Taichung City",
    chineseName: "臺中市",
    population: 2813490,
    area: 2214.90,
    density: 1270,
    towns: [
      {
        name: "West District",
        chineseName: "西區",
        location: { lat: 24.1469, lng: 120.6640 },
        searchRadiusKm: 4,
        population: 115627
      },
      {
        name: "North District",
        chineseName: "北區",
        location: { lat: 24.1589, lng: 120.6840 },
        searchRadiusKm: 4,
        population: 147653
      }
    ]
  },
  {
    name: "Changhua County",
    chineseName: "彰化縣",
    population: 1274582,
    area: 1074.40,
    density: 1186,
    towns: [
      {
        name: "Changhua City",
        chineseName: "彰化市",
        location: { lat: 24.0734, lng: 120.5134 },
        searchRadiusKm: 4,
        population: 233524
      },
      {
        name: "Lukang Township",
        chineseName: "鹿港鎮",
        location: { lat: 24.0579, lng: 120.4346 },
        searchRadiusKm: 4,
        population: 86779
      },
      {
        name: "Hemei Township",
        chineseName: "和美鎮",
        location: { lat: 24.1151, lng: 120.5014 },
        searchRadiusKm: 4,
        population: 91645
      }
    ]
  },
  {
    name: "Yunlin County",
    chineseName: "雲林縣",
    population: 672000,
    area: 1290.83,
    density: 521,
    towns: [
      {
        name: "Douliu City",
        chineseName: "斗六市",
        location: { lat: 23.7070, lng: 120.5444 },
        searchRadiusKm: 4,
        population: 108567
      },
      {
        name: "Huwei Township",
        chineseName: "虎尾鎮",
        location: { lat: 23.7079, lng: 120.4352 },
        searchRadiusKm: 4,
        population: 70893
      },
      {
        name: "Beigang Township",
        chineseName: "北港鎮",
        location: { lat: 23.5751, lng: 120.3029 },
        searchRadiusKm: 4,
        population: 40124
      }
    ]
  },

   // -------------------- Southern Taiwan --------------------
  {
    name: "Tainan City",
    chineseName: "臺南市",
    population: 1875676,
    area: 2191.65,
    density: 856,
    towns: [
      {
        name: "West Central District",
        chineseName: "中西區",
        location: { lat: 22.9920, lng: 120.2027 },
        searchRadiusKm: 4,
        population: 77828
      },
      {
        name: "East District",
        chineseName: "東區",
        location: { lat: 22.9812, lng: 120.2281 },
        searchRadiusKm: 4,
        population: 186850
      },
      {
        name: "South District",
        chineseName: "南區",
        location: { lat: 22.9557, lng: 120.1887 },
        searchRadiusKm: 4,
        population: 125605
      },
      {
        name: "North District",
        chineseName: "北區",
        location: { lat: 23.0103, lng: 120.2074 },
        searchRadiusKm: 4,
        population: 131980
      },
      {
        name: "Anping District",
        chineseName: "安平區",
        location: { lat: 22.9900, lng: 120.1652 },
        searchRadiusKm: 4,
        population: 66676
      }
    ]
  },
  {
    name: "Kaohsiung City",
    chineseName: "高雄市",
    population: 2765932,
    area: 2951.85,
    density: 937,
    towns: [
      {
        name: "Xinxing District",
        chineseName: "新興區",
        location: { lat: 22.6310, lng: 120.3072 },
        searchRadiusKm: 4,
        population: 51557
      },
      {
        name: "Lingya District",
        chineseName: "苓雅區",
        location: { lat: 22.6219, lng: 120.3120 },
        searchRadiusKm: 4,
        population: 171033
      },
      {
        name: "Sanmin District",
        chineseName: "三民區",
        location: { lat: 22.6590, lng: 120.3187 },
        searchRadiusKm: 4,
        population: 343243
      },
      {
        name: "Qianjin District",
        chineseName: "前金區",
        location: { lat: 22.6262, lng: 120.2944 },
        searchRadiusKm: 4,
        population: 27438
      },
      {
        name: "Yancheng District",
        chineseName: "鹽埕區",
        location: { lat: 22.6242, lng: 120.2841 },
        searchRadiusKm: 4,
        population: 24066
      }
    ]
  },

   // -------------------- Eastern Taiwan --------------------
  {
    name: "Hualien County",
    chineseName: "花蓮縣",
    population: 327000,
    area: 4628.57,
    density: 71,
    towns: [
      {
        name: "Hualien City",
        chineseName: "花蓮市",
        location: { lat: 23.9769, lng: 121.6044 },
        searchRadiusKm: 4,
        population: 104371
      },
      {
        name: "Ji'an Township",
        chineseName: "吉安鄉",
        location: { lat: 23.9617, lng: 121.5829 },
        searchRadiusKm: 4,
        population: 83751
      },
      {
        name: "Shoufeng Township",
        chineseName: "壽豐鄉",
        location: { lat: 23.8712, lng: 121.5088 },
        searchRadiusKm: 5,
        population: 17553
      }
    ]
  },
  {
    name: "Taitung County",
    chineseName: "臺東縣",
    population: 220000,
    area: 3515.25,
    density: 63,
    towns: [
      {
        name: "Taitung City",
        chineseName: "臺東市",
        location: { lat: 22.7583, lng: 121.1444 },
        searchRadiusKm: 4,
        population: 104929
      },
      {
        name: "Dawu Township",
        chineseName: "大武鄉",
        location: { lat: 22.3577, lng: 120.8979 },
        searchRadiusKm: 5,
        population: 3760
      },
      {
        name: "Chengong Township",
        chineseName: "成功鎮",
        location: { lat: 23.1000, lng: 121.3667 },
        searchRadiusKm: 5,
        population: 14142
      }
    ]
  },

 // -------------------- Outlying Islands --------------------
  {
    name: "Penghu County",
    chineseName: "澎湖縣",
    population: 105000,
    area: 141.05,
    density: 744,
    towns: [
      {
        name: "Magong City",
        chineseName: "馬公市",
        location: { lat: 23.5654, lng: 119.5664 },
        searchRadiusKm: 3,
        population: 62221
      },
      {
        name: "Huxi Township",
        chineseName: "湖西鄉",
        location: { lat: 23.5737, lng: 119.5168 },
        searchRadiusKm: 3,
        population: 14592
      },
      {
        name: "Baisha Township",
        chineseName: "白沙鄉",
        location: { lat: 23.6661, lng: 119.5927 },
        searchRadiusKm: 3,
        population: 9757
      }
    ]
  },
  {
    name: "Kinmen County",
    chineseName: "金門縣",
    population: 140000,
    area: 153.06,
    density: 914,
    towns: [
      {
        name: "Jincheng Township",
        chineseName: "金城鎮",
        location: { lat: 24.4340, lng: 118.3167 },
        searchRadiusKm: 3,
        population: 43633
      },
      {
        name: "Jinhu Township",
        chineseName: "金湖鎮",
        location: { lat: 24.4376, lng: 118.4197 },
        searchRadiusKm: 3,
        population: 29839
      },
      {
        name: "Jinsha Township",
        chineseName: "金沙鎮",
        location: { lat: 24.4879, lng: 118.4279 },
        searchRadiusKm: 3,
        population: 20939
      }
    ]
  },
  ];

  // ==================== Utility Functions ====================

// Get county data by county name

export function getCountyByName(countyName: string): EnhancedCountyData | undefined {
  return counties.find(county => county.name === countyName);
}

// Get all towns for a specific county
 
export function getTownsByCounty(countyName: string): EnhancedTownData[] {
  const county = getCountyByName(countyName);
  return county?.towns || [];
}

// Get all towns across all counties with their county information

export function getAllTowns(): (EnhancedTownData & { 
  countyName: string; 
  countyChineseName: string 
})[] {
  return counties.flatMap(county => 
    county.towns.map(town => ({
      ...town,
      countyName: county.name,
      countyChineseName: county.chineseName
    }))
  );
}

// Get all counties in a specific region

export function getCountiesByRegion(region: Region): EnhancedCountyData[] {
  return counties.filter(county => REGIONS[region].includes(county.name));
}

// Get Chinese name for a county

export function getCountyChineseName(countyName: string): string | undefined {
  return getCountyByName(countyName)?.chineseName;
}

// Search counties and towns by name (English or Chinese)
 
export function searchCountiesAndTowns(searchTerm: string): {
  counties: EnhancedCountyData[];
  towns: (EnhancedTownData & { countyName: string; countyChineseName: string })[];
} {
  const normalizedSearch = searchTerm.toLowerCase();
  
  const matchedCounties = counties.filter(county => 
    county.name.toLowerCase().includes(normalizedSearch) ||
    county.chineseName.includes(searchTerm)
  );

  const matchedTowns = getAllTowns().filter(town => 
    town.name.toLowerCase().includes(normalizedSearch) ||
    town.chineseName.includes(searchTerm)
  );

  return {
    counties: matchedCounties,
    towns: matchedTowns
  };
}

// Get the region for a specific county

export function getRegionForCounty(countyName: string): Region | undefined {
  return Object.entries(REGIONS).find(([_, counties]) => 
    counties.includes(countyName)
  )?.[0] as Region | undefined;
}

//Get comprehensive statistics for a specific county

export function getCountyStats(countyName: string): {
  totalPopulation: number;
  totalArea: number;
  populationDensity: number;
  numberOfTowns: number;
  averageSearchRadius: number;
  largestTown: string;
  smallestTown: string;
} | undefined {
  const county = getCountyByName(countyName);
  if (!county) return undefined;

  const towns = county.towns;
  const largestTown = towns.reduce((prev, current) => 
    (prev.population || 0) > (current.population || 0) ? prev : current
  );
  const smallestTown = towns.reduce((prev, current) => 
    (prev.population || 0) < (current.population || 0) ? prev : current
  );
  const avgRadius = towns.reduce((sum, town) => sum + town.searchRadiusKm, 0) / towns.length;

  return {
    totalPopulation: county.population,
    totalArea: county.area,
    populationDensity: county.density,
    numberOfTowns: county.towns.length,
    averageSearchRadius: Math.round(avgRadius * 100) / 100,
    largestTown: `${largestTown.name} (${largestTown.population?.toLocaleString() || 'N/A'})`,
    smallestTown: `${smallestTown.name} (${smallestTown.population?.toLocaleString() || 'N/A'})`
  };
}

// Calculate optimal search radius based on location and population density

export function calculateOptimalSearchRadius(
  latitude: number,
  longitude: number,
  options: {
    minRadius?: number;
    maxRadius?: number;
    densityThresholds?: {
      urban: number;
      suburban: number;
    };
  } = {}
): number {
  const {
    minRadius = 3,
    maxRadius = 5,
    densityThresholds = {
      urban: 5000,
      suburban: 1000
    }
  } = options;

  // Find the county containing this location
  const county = counties.find(county => 
    county.towns.some(town => {
      const latDiff = Math.abs(town.location.lat - latitude);
      const lngDiff = Math.abs(town.location.lng - longitude);
      // Using approximate degree to km conversion at Taiwan's latitude
      return latDiff < 0.1 && lngDiff < 0.1; // Roughly 11km radius
    })
  );

  if (!county) return 4; // Default radius if location not found

  // Adjust radius based on population density
  if (county.density > densityThresholds.urban) {
    return minRadius; // Dense urban areas
  } else if (county.density > densityThresholds.suburban) {
    return minRadius + 1; // Suburban areas
  } else {
    return maxRadius; // Rural areas
  }
}

// Get nearby towns within a specified radius

export function getNearbyTowns(
  latitude: number,
  longitude: number,
  radiusKm: number = 10
): Array<EnhancedTownData & { distance: number; countyName: string }> {
  const R = 6371; // Earth's radius in kilometers
  const nearby = counties.flatMap(county =>
    county.towns.map(town => {
      // Calculate distance using the Haversine formula
      const dLat = (town.location.lat - latitude) * Math.PI / 180;
      const dLon = (town.location.lng - longitude) * Math.PI / 180;
      const lat1 = latitude * Math.PI / 180;
      const lat2 = town.location.lat * Math.PI / 180;

      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.sin(dLon/2) * Math.sin(dLon/2) * 
                Math.cos(lat1) * Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      return {
        ...town,
        distance,
        countyName: county.name
      };
    })
  ).filter(town => town.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

  return nearby;
}

//Get county statistics for a specific region

export function getRegionStats(region: Region): {
  totalPopulation: number;
  totalArea: number;
  averageDensity: number;
  countyCount: number;
  townCount: number;
  mostPopulousCounty: string;
  leastPopulousCounty: string;
} {
  const regionCounties = getCountiesByRegion(region);
  
  const totalPopulation = regionCounties.reduce((sum, county) => sum + county.population, 0);
  const totalArea = regionCounties.reduce((sum, county) => sum + county.area, 0);
  const townCount = regionCounties.reduce((sum, county) => sum + county.towns.length, 0);
  
  const mostPopulous = regionCounties.reduce((prev, current) => 
    prev.population > current.population ? prev : current
  );
  
  const leastPopulous = regionCounties.reduce((prev, current) => 
    prev.population < current.population ? prev : current
  );

  return {
    totalPopulation,
    totalArea,
    averageDensity: Math.round((totalPopulation / totalArea) * 100) / 100,
    countyCount: regionCounties.length,
    townCount,
    mostPopulousCounty: `${mostPopulous.name} (${mostPopulous.population.toLocaleString()})`,
    leastPopulousCounty: `${leastPopulous.name} (${leastPopulous.population.toLocaleString()})`
  };
}

// Validate county and town data integrity

export function validateCountyData(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate county names
  const countyNames = new Set<string>();
  counties.forEach(county => {
    if (countyNames.has(county.name)) {
      errors.push(`Duplicate county name: ${county.name}`);
    }
    countyNames.add(county.name);

    // Check for required fields
    if (!county.population) warnings.push(`Missing population for ${county.name}`);
    if (!county.area) warnings.push(`Missing area for ${county.name}`);
    if (!county.density) warnings.push(`Missing density for ${county.name}`);
    
    // Validate towns
    if (!county.towns.length) {
      errors.push(`No towns defined for ${county.name}`);
    }

    county.towns.forEach(town => {
      if (!town.location.lat || !town.location.lng) {
        errors.push(`Missing coordinates for ${town.name} in ${county.name}`);
      }
      if (!town.searchRadiusKm) {
        warnings.push(`Missing search radius for ${town.name} in ${county.name}`);
      }
    });
  });

  // Check that all counties in REGIONS exist in the data
  Object.values(REGIONS).flat().forEach(countyName => {
    if (!counties.find(c => c.name === countyName)) {
      errors.push(`County ${countyName} referenced in REGIONS but not defined in data`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export default counties;

