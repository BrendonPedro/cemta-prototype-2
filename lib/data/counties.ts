// app/lib/data/counties.ts

import { CountyData } from "@/lib/database-builder/types";

// Define region type
export type Region = 'NORTHERN' | 'CENTRAL' | 'SOUTHERN' | 'EASTERN' | 'OUTLYING';

// Define interfaces for our enhanced data
export interface EnhancedTownData {
  name: string;
  chineseName: string;
  location: { lat: number; lng: number };
  searchRadiusKm: number;
  population?: number;
}

export interface EnhancedCountyData extends Omit<CountyData, 'towns'> {
  name: string;
  chineseName: string;
  population: number;
  area: number; // in km²
  density: number; // population per km²
  towns: EnhancedTownData[];
}

const newCounties: EnhancedCountyData[] = [
  {
    name: "Chiayi City",
    chineseName: "嘉義市",
    population: 269398,
    area: 60.03,
    density: 4488,
    towns: [
      {
        name: "East District",
        chineseName: "東區",
        location: { lat: 23.4803, lng: 120.4486 },
        searchRadiusKm: 3,
        population: 125765
      },
      {
        name: "West District",
        chineseName: "西區",
        location: { lat: 23.4798, lng: 120.4250 },
        searchRadiusKm: 3,
        population: 143633
      }
    ]
  },
  {
    name: "Chiayi County",
    chineseName: "嘉義縣",
    population: 510000,
    area: 1903.64,
    density: 268,
    towns: [
      {
        name: "Minxiong Township",
        chineseName: "民雄鄉",
        location: { lat: 23.5519, lng: 120.4283 },
        searchRadiusKm: 4,
        population: 71564
      },
      {
        name: "Puzi City",
        chineseName: "朴子市",
        location: { lat: 23.4649, lng: 120.2470 },
        searchRadiusKm: 4,
        population: 42514
      },
      {
        name: "Taibao City",
        chineseName: "太保市",
        location: { lat: 23.4589, lng: 120.3319 },
        searchRadiusKm: 4,
        population: 37941
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
  }
];

// Define REGIONS 
export const REGIONS: Record<Region, string[]> = {
  NORTHERN: ["Taipei City", "New Taipei City", "Keelung City", "Taoyuan City", "Hsinchu City"],
  CENTRAL: ["Miaoli County", "Taichung City", "Changhua County", "Yunlin County"],
  SOUTHERN: ["Chiayi City", "Chiayi County", "Tainan City", "Kaohsiung City"],
  EASTERN: ["Hualien County", "Taitung County"],
  OUTLYING: ["Penghu County", "Kinmen County"]
};


export const counties: EnhancedCountyData[] = [
  // Northern Taiwan
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
      },
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
      },
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
      },
    ]
  },

  // Central Taiwan
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
      },
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
      },
    ]
  },
  // Southern Taiwan
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

  // Eastern Taiwan
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

  // Outlying Islands
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

  // Additional Counties in Northern Taiwan
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

  // Additional Counties in Central Taiwan
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
  }
];

// Helper functions remain the same but use EnhancedCountyData and EnhancedTownData types
export function getCountyByName(countyName: string): EnhancedCountyData | undefined {
  return counties.find(county => county.name === countyName);
}

export function getTownsByCounty(countyName: string): EnhancedTownData[] {
  const county = getCountyByName(countyName);
  return county?.towns || [];
}

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

export function getCountiesByRegion(region: Region): EnhancedCountyData[] {
  return counties.filter(county => REGIONS[region].includes(county.name));
}

// Helper functions for the counties data
export function getCountyChineseName(countyName: string): string | undefined {
  return getCountyByName(countyName)?.chineseName;
}

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

export function getRegionForCounty(countyName: string): Region | undefined {
  return Object.entries(REGIONS).find(([_, counties]) => 
    counties.includes(countyName)
  )?.[0] as Region | undefined;
}

export function getCountyStats(countyName: string): {
  totalPopulation: number;
  totalArea: number;
  populationDensity: number;
  numberOfTowns: number;
} | undefined {
  const county = getCountyByName(countyName);
  if (!county) return undefined;

  return {
    totalPopulation: county.population,
    totalArea: county.area,
    populationDensity: county.density,
    numberOfTowns: county.towns.length
  };
}

export function calculateOptimalSearchRadius(
  latitude: number,
  longitude: number
): number {
  const county = counties.find(county => 
    county.towns.some(town => 
      Math.abs(town.location.lat - latitude) < 0.1 &&
      Math.abs(town.location.lng - longitude) < 0.1
    )
  );

  if (!county) return 4; // Default radius

  // Adjust radius based on population density
  if (county.density > 5000) return 3; // Dense urban areas
  if (county.density > 1000) return 4; // Urban/suburban areas
  return 5; // Rural areas
}