// scripts/monitor-database.ts

import { getCountyStats } from '../lib/database-builder/monitoring';
import type { CountyStats } from '../lib/database-builder/types';
import { writeFileSync } from 'fs';
import path from 'path';

async function monitorDatabase() {
  try {
    const counties = ['Taipei City', 'New Taipei City', 'Taoyuan City', 'Miaoli County'];
    const countyStats: CountyStats[] = await Promise.all(
      counties.map(county => getCountyStats(county))
    );

    const summary = {
      totalRestaurants: countyStats.reduce((sum: number, county) => sum + county.restaurants, 0),
      totalPhotos: countyStats.reduce((sum: number, county) => sum + county.photos, 0),
      totalMenus: countyStats.reduce((sum: number, county) => sum + county.menus, 0)
    };

    // Generate report
      const report = {
      timestamp: new Date().toISOString(),
      countyStats,
      summary
    };

    const reportPath = path.join(process.cwd(), 'reports', `database-status-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n=== Database Status Report ===');
    console.log('\nOverall Summary:');
    console.log(`Total Restaurants: ${summary.totalRestaurants}`);
    console.log(`Total Photos: ${summary.totalPhotos}`);
    console.log(`Total Menus: ${summary.totalMenus}`);

    console.log('\nCounty Statistics:');
    countyStats.forEach((county: CountyStats) => {
      console.log(`\n${county.name}:`);
      console.log(`  Restaurants: ${county.restaurants}`);
      console.log(`  Photos: ${county.photos}`);
      console.log(`  Menus: ${county.menus}`);
      console.log(`  Towns Covered: ${county.towns.length}`);
    });

  } catch (error) {
    console.error('Error monitoring database:', error);
  }
}

if (require.main === module) {
  monitorDatabase().catch(console.error);
}

export { monitorDatabase };