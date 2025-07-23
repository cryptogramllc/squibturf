// Global cache service for NewsPage data
interface NewsItemData {
  text: string;
  image: string;
  video?: string;
  user_name: string;
  user_id: string;
  post_id: string;
  time_stamp: number;
  date_key?: number;
  lat?: number;
  lon?: number;
  location?: { city?: string; state?: string; country?: string };
  type?: 'photo' | 'video';
  user_photo?: string;
}

interface CacheData {
  squibs: NewsItemData[];
  lastKey: any;
  lastLoadTime: number;
  location: { lon: number; lat: number } | null;
  scrollPosition: number; // Add scroll position
}

class NewsCache {
  private static instance: NewsCache;
  private cache: CacheData = {
    squibs: [],
    lastKey: null,
    lastLoadTime: 0,
    location: null,
    scrollPosition: 0, // Initialize scroll position
  };

  private constructor() {}

  static getInstance(): NewsCache {
    if (!NewsCache.instance) {
      NewsCache.instance = new NewsCache();
    }
    return NewsCache.instance;
  }

  // Get cached data
  getData(): CacheData {
    return { ...this.cache };
  }

  // Set cached data
  setData(data: Partial<CacheData>): void {
    this.cache = { ...this.cache, ...data };
    console.log('NewsCache: Data cached', {
      squibsCount: this.cache.squibs.length,
      lastLoadTime: new Date(this.cache.lastLoadTime).toLocaleTimeString(),
      scrollPosition: this.cache.scrollPosition,
    });
  }

  // Check if cache is valid (less than 5 minutes old)
  isCacheValid(): boolean {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return (
      this.cache.lastLoadTime > 0 && now - this.cache.lastLoadTime < fiveMinutes
    );
  }

  // Check if we have any cached data
  hasData(): boolean {
    return this.cache.squibs.length > 0;
  }

  // Clear cache
  clearCache(): void {
    this.cache = {
      squibs: [],
      lastKey: null,
      lastLoadTime: 0,
      location: null,
      scrollPosition: 0,
    };
    console.log('NewsCache: Cache cleared');
  }

  // Add more items to cache (for pagination)
  appendData(squibs: NewsItemData[], lastKey: any): void {
    this.cache.squibs = [...this.cache.squibs, ...squibs];
    this.cache.lastKey = lastKey;
    console.log('NewsCache: Appended data', {
      totalSquibs: this.cache.squibs.length,
      newSquibs: squibs.length,
    });
  }

  // Update location cache
  setLocation(location: { lon: number; lat: number }): void {
    this.cache.location = location;
  }

  // Get cached location
  getLocation(): { lon: number; lat: number } | null {
    return this.cache.location;
  }

  // Set scroll position
  setScrollPosition(position: number): void {
    this.cache.scrollPosition = position;
    console.log('NewsCache: Scroll position cached:', position);
  }

  // Get scroll position
  getScrollPosition(): number {
    return this.cache.scrollPosition;
  }
}

export default NewsCache;
export type { CacheData, NewsItemData };
