// Unified cache service
import { CONFIG } from '@/lib/database-builder/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from "@/config/firebaseConfig";
import type { CacheEntry } from './types';

// Memory cache
const memoryCache = new Map<string, CacheEntry<any>>();

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryCached = memoryCache.get(key);
    const now = Date.now();
    
    if (memoryCached && now < memoryCached.expiresAt) {
      return memoryCached.data;
    }
    
    // Try Firestore cache
    try {
      const docRef = doc(db, CONFIG.FIRESTORE.COLLECTIONS.MAPS_CACHE, key);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.expiresAt && data.expiresAt > now) {
          // Update memory cache
          memoryCache.set(key, {
            data: data.data,
            timestamp: now,
            expiresAt: data.expiresAt
          });
          return data.data as T;
        }
      }
    } catch (error) {
      console.error('Error reading from Firestore cache:', error);
    }
    
    return null;
  },
  
  async set<T>(key: string, data: T, ttl: number = CONFIG.CACHE.DURATION): Promise<void> {
    const now = Date.now();
    const expiresAt = now + ttl;
    
    // Update memory cache
    memoryCache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });
    
    // Update Firestore cache
    try {
      const docRef = doc(db, CONFIG.FIRESTORE.COLLECTIONS.MAPS_CACHE, key);
      await setDoc(docRef, {
        data,
        timestamp: serverTimestamp(),
        expiresAt
      });
    } catch (error) {
      console.error('Error writing to Firestore cache:', error);
    }
  },
  
  async invalidate(key: string): Promise<void> {
    // Remove from memory cache
    memoryCache.delete(key);
    
    // Mark as invalid in Firestore
    try {
      const docRef = doc(db, CONFIG.FIRESTORE.COLLECTIONS.MAPS_CACHE, key);
      await setDoc(docRef, { 
        invalidated: true,
        timestamp: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  },
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
      if (now > entry.expiresAt) {
        memoryCache.delete(key);
      }
    }
  }
};

// Set up periodic cleanup
setInterval(() => cacheService.cleanup(), CONFIG.PROCESSING.VERIFICATION_INTERVAL); 