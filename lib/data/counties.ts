import { CountyData } from "@/lib/database-builder/types";

export const counties: CountyData[] = [
  {
    name: "Miaoli County",
    towns: [
      {
        name: "Miaoli City",
        location: { lat: 24.5701, lng: 120.8227 },
        searchRadiusKm: 5,
      },
      {
        name: "Toufen",
        location: { lat: 24.6836, lng: 120.8878 },
        searchRadiusKm: 4,
      },
      // Add other towns...
    ],
  },
  // Add other counties...
];