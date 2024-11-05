// app/scripts/database-builder/monitor.ts

import { DatabaseManager } from './management';

async function monitorProgress() {
  const manager = new DatabaseManager();
  
  // Get stats for a specific county
  const miaoliStats = await manager.getCountyStats('Miaoli County');
  console.log('Miaoli County Statistics:', miaoliStats);

  // Find restaurants needing attention
  const incompleteRestaurants = await manager.findIncompleteRestaurants({
    minPhotos: 3,
    requireMenu: true
  });
  console.log('Restaurants needing attention:', incompleteRestaurants.length);

  // Check overall progress
  const progress = await manager.getProcessingProgress();
  console.log('Overall Progress:', progress);
}

monitorProgress().catch(console.error);