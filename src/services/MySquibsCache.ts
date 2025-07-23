// Global cache service for MySquibs page data
interface NewsItemData {
  text: string;
  image: string;
  video?: string;
  uuid: string;
  user_id: string;
  post_id: string;
  time_stamp: number;
  date_key?: number;
  lat?: number;
  lon?: number;
  location?: { city?: string; state?: string; country?: string };
  type?: 'photo' | 'video';
}

interface CacheData {
  squibs: NewsItemData[];
  lastKey: any;
  lastLoadTime: number;
  scrollPosition: number;
}

class MySquibsCache {
  private static instance: MySquibsCache;
  private cache: CacheData = {
    squibs: [],
    lastKey: null,
    lastLoadTime: 0,
    scrollPosition: 0,
  };

  private constructor() {}

  static getInstance(): MySquibsCache {
    if (!MySquibsCache.instance) {
      MySquibsCache.instance = new MySquibsCache();
    }
    return MySquibsCache.instance;
  }

  // Get cached data
  getData(): CacheData {
    return { ...this.cache };
  }

  // Set cached data
  setData(data: Partial<CacheData>): void {
    this.cache = { ...this.cache, ...data };
    console.log('MySquibsCache: Data cached', {
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
      scrollPosition: 0,
    };
    console.log('MySquibsCache: Cache cleared');
  }

  // Add more items to cache (for pagination)
  appendData(squibs: NewsItemData[], lastKey: any): void {
    this.cache.squibs = [...this.cache.squibs, ...squibs];
    this.cache.lastKey = lastKey;
    console.log('MySquibsCache: Appended data', {
      totalSquibs: this.cache.squibs.length,
      newSquibs: squibs.length,
    });
  }

  // Set scroll position
  setScrollPosition(position: number): void {
    this.cache.scrollPosition = position;
    console.log('MySquibsCache: Scroll position cached:', position);
  }

  // Get scroll position
  getScrollPosition(): number {
    return this.cache.scrollPosition;
  }
}

export default MySquibsCache;
export type { CacheData, NewsItemData };
