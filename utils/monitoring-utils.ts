// utils/monitoring-utils.ts

import { getMonitoringStats } from '../lib/database-builder/monitoring';
import { writeFileSync } from 'fs';
import path from 'path';

export async function generateMonitoringReport(counties: string[]) {
  try {
    const stats = await getMonitoringStats(counties);
    
    const report = {
      timestamp: new Date().toISOString(),
      ...stats
    };

    // Save report to file
    const reportPath = path.join(process.cwd(), 'reports', `database-status-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  } catch (error) {
    console.error('Error generating monitoring report:', error);
    throw error;
  }
}