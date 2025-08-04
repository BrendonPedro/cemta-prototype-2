import type { MapState } from '@/app/services/maps/types';

class MapStateCache {
  private state: MapState | null = null;

  async get(key: string): Promise<MapState | null> {
    // In a real implementation, this would fetch from storage
    return this.state;
  }

  async set(key: string, state: MapState): Promise<void> {
    this.state = {
      ...state,
      timestamp: new Date()
    };
  }

  clear(): void {
    this.state = null;
  }

  isValid(): boolean {
    if (!this.state) return false;
    
    const now = new Date();
    const cacheTime = this.state.timestamp;
    const diffMinutes = (now.getTime() - cacheTime.getTime()) / (1000 * 60);
    
    // Cache is valid for 30 minutes
    return diffMinutes < 30;
  }
}

// Singleton instance
export const mapStateCache = new MapStateCache(); 