// scripts/verify.mjs
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as countiesModule from '../lib/data/counties.ts';
const { counties } = countiesModule;

import dbModule from '../lib/database-builder/db.ts';
const db = dbModule;

// Import firestore functions
import * as firestoreModule from '../app/services/firebaseFirestore.ts';
const { verifyAndFixRestaurantCount } = firestoreModule;

import { doc, getDoc } from 'firebase/firestore';

async function verifyAllAreas() {
  console.log('Starting database verification...');
  let totalProcessed = 0;
  let totalFixed = 0;

  try {
    for (const county of counties) {
      console.log(`\nProcessing ${county.name}...`);
      
      for (const town of county.towns) {
        process.stdout.write(`  Verifying ${town.name}... `);
        
        try {
          // Get current counts
          const countyRef = doc(db, 'counties', county.name);
          const townRef = doc(countyRef, 'towns', town.name);
          const countyDoc = await getDoc(countyRef);
          const townDoc = await getDoc(townRef);
          const oldCountyCount = countyDoc.data()?.restaurantCount || 0;
          const oldTownCount = townDoc.data()?.restaurantCount || 0;

          // Verify and fix
          await verifyAndFixRestaurantCount(county.name, town.name);
          
          // Get new counts
          const newCountyDoc = await getDoc(countyRef);
          const newTownDoc = await getDoc(townRef);
          const newCountyCount = newCountyDoc.data()?.restaurantCount || 0;
          const newTownCount = newTownDoc.data()?.restaurantCount || 0;

          // Check if counts were fixed
          const wasFixed = oldCountyCount !== newCountyCount || oldTownCount !== newTownCount;
          
          if (wasFixed) {
            console.log(`✓ Fixed! (${oldCountyCount}/${oldTownCount} → ${newCountyCount}/${newTownCount})`);
            totalFixed++;
          } else {
            console.log('✓ Verified (no fixes needed)');
          }

          totalProcessed++;
        } catch (error) {
          console.log(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    console.log('\n=========================');
    console.log('Verification Complete!');
    console.log(`Total areas processed: ${totalProcessed}`);
    console.log(`Areas fixed: ${totalFixed}`);
    console.log('=========================');

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    // Exit the process when done
    process.exit(0);
  }
}

// Run the verification
verifyAllAreas().catch(console.error);