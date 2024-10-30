// lib/database-builder/batch-processor.ts

import { counties } from '@/lib/data/counties';
import type { EnhancedCountyData, EnhancedTownData } from '@/lib/data/counties';

export function selectProcessingAreas(
  selectedCounties: string[],
  selectedTowns: { [countyName: string]: string[] } = {}
) {
  const areas = selectedCounties.map(countyName => {
    const county = counties.find(c => c.name === countyName);
    if (!county) return null;

    const townsList = selectedTowns[countyName]
      ? county.towns.filter(town => selectedTowns[countyName].includes(town.name))
      : county.towns;

    return {
      county,
      towns: townsList
    };
  }).filter((area): area is NonNullable<typeof area> => area !== null);

  return areas;
}