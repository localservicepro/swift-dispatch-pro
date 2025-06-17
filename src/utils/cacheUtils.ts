
/**
 * Browser Cache Management Utilities
 * Handles clearing browser-side caches during development
 */

export interface CacheStats {
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  reactQuery: boolean;
  supabase: boolean;
}

export class BrowserCacheManager {
  private static instance: BrowserCacheManager;
  
  static getInstance(): BrowserCacheManager {
    if (!BrowserCacheManager.instance) {
      BrowserCacheManager.instance = new BrowserCacheManager();
    }
    return BrowserCacheManager.instance;
  }

  /**
   * Clear localStorage with optional key filtering
   */
  clearLocalStorage(keyPattern?: string): boolean {
    try {
      if (keyPattern) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes(keyPattern)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`🧹 Cleared localStorage keys matching: ${keyPattern}`);
      } else {
        localStorage.clear();
        console.log('🧹 Cleared all localStorage');
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to clear localStorage:', error);
      return false;
    }
  }

  /**
   * Clear sessionStorage with optional key filtering
   */
  clearSessionStorage(keyPattern?: string): boolean {
    try {
      if (keyPattern) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.includes(keyPattern)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
        console.log(`🧹 Cleared sessionStorage keys matching: ${keyPattern}`);
      } else {
        sessionStorage.clear();
        console.log('🧹 Cleared all sessionStorage');
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to clear sessionStorage:', error);
      return false;
    }
  }

  /**
   * Clear IndexedDB databases
   */
  async clearIndexedDB(): Promise<boolean> {
    try {
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases.map(db => {
            if (db.name) {
              return new Promise<void>((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(db.name!);
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => reject(deleteReq.error);
                deleteReq.onblocked = () => {
                  console.warn(`🚫 IndexedDB deletion blocked: ${db.name}`);
                  resolve(); // Don't fail completely
                };
              });
            }
            return Promise.resolve();
          })
        );
        console.log('🧹 Cleared IndexedDB databases');
        return true;
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to clear IndexedDB:', error);
      return false;
    }
  }

  /**
   * Clear Supabase-related cache
   */
  clearSupabaseCache(): boolean {
    try {
      // Clear Supabase auth tokens and session data
      this.clearLocalStorage('supabase');
      this.clearSessionStorage('supabase');
      
      // Clear any Supabase-related keys
      const supabaseKeys = ['sb-', 'supabase.auth', 'gotrue'];
      supabaseKeys.forEach(pattern => {
        this.clearLocalStorage(pattern);
        this.clearSessionStorage(pattern);
      });
      
      console.log('🧹 Cleared Supabase cache');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear Supabase cache:', error);
      return false;
    }
  }

  /**
   * Clear all browser caches
   */
  async clearAll(): Promise<CacheStats> {
    console.log('🧹 Starting browser cache cleanup...');
    
    const stats: CacheStats = {
      localStorage: this.clearLocalStorage(),
      sessionStorage: this.clearSessionStorage(),
      indexedDB: await this.clearIndexedDB(),
      reactQuery: true, // Will be handled by React Query
      supabase: this.clearSupabaseCache()
    };

    // Clear React Query cache if available
    if (window.__REACT_QUERY_CACHE__) {
      try {
        window.__REACT_QUERY_CACHE__.clear();
        console.log('🧹 Cleared React Query cache');
      } catch (error) {
        console.error('❌ Failed to clear React Query cache:', error);
        stats.reactQuery = false;
      }
    }

    console.log('🎉 Browser cache cleanup completed!', stats);
    return stats;
  }

  /**
   * Development helper to clear caches when specific conditions are met
   */
  clearOnError(error: any): void {
    if (process.env.NODE_ENV === 'development') {
      const errorMessage = error?.message?.toLowerCase() || '';
      
      // Clear cache if we detect common caching-related errors
      const cachingErrors = [
        'invalid input syntax for type json',
        'unexpected token',
        'syntaxerror',
        'module not found',
        'cached response'
      ];
      
      if (cachingErrors.some(pattern => errorMessage.includes(pattern))) {
        console.warn('🔧 Detected potential cache-related error, clearing browser cache...');
        this.clearAll();
      }
    }
  }
}

// Export singleton instance
export const browserCacheManager = BrowserCacheManager.getInstance();

// Development-only global access
if (process.env.NODE_ENV === 'development') {
  (window as any).__clearCache = () => browserCacheManager.clearAll();
  (window as any).__clearLocalStorage = () => browserCacheManager.clearLocalStorage();
  (window as any).__clearSupabaseCache = () => browserCacheManager.clearSupabaseCache();
}
