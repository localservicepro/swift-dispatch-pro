
import { QueryClient } from '@tanstack/react-query';
import { browserCacheManager } from '@/utils/cacheUtils';

/**
 * Development Cache Service
 * Coordinates cache clearing across different systems
 */
export class DevelopmentCacheService {
  private queryClient: QueryClient | null = null;

  setQueryClient(client: QueryClient) {
    this.queryClient = client;
  }

  /**
   * Clear React Query cache
   */
  async clearReactQueryCache(): Promise<boolean> {
    try {
      if (this.queryClient) {
        await this.queryClient.clear();
        console.log('🧹 Cleared React Query cache');
        return true;
      }
      console.warn('⚠️ React Query client not available');
      return false;
    } catch (error) {
      console.error('❌ Failed to clear React Query cache:', error);
      return false;
    }
  }

  /**
   * Invalidate specific React Query keys
   */
  async invalidateQueries(queryKey: string[]): Promise<boolean> {
    try {
      if (this.queryClient) {
        await this.queryClient.invalidateQueries({ queryKey });
        console.log(`🔄 Invalidated queries: ${queryKey.join('.')}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to invalidate queries:', error);
      return false;
    }
  }

  /**
   * Clear all development caches
   */
  async clearAllDevelopmentCaches(): Promise<void> {
    console.log('🚀 Starting comprehensive cache cleanup...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Clear browser caches
    const browserStats = await browserCacheManager.clearAll();
    
    // Clear React Query cache
    const reactQueryCleared = await this.clearReactQueryCache();

    // Force page reload to clear any remaining caches
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Reloading page to complete cache cleanup...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Development cache cleanup completed!');
    console.log('Browser caches:', browserStats);
    console.log('React Query cache:', reactQueryCleared ? '✅' : '❌');
  }

  /**
   * Clear caches related to specific features
   */
  async clearFeatureCache(feature: 'orders' | 'customers' | 'products' | 'auth'): Promise<void> {
    console.log(`🎯 Clearing ${feature} related caches...`);

    switch (feature) {
      case 'orders':
        await this.invalidateQueries(['orders']);
        await this.invalidateQueries(['order-items']);
        browserCacheManager.clearLocalStorage('order');
        break;
      
      case 'customers':
        await this.invalidateQueries(['customers']);
        browserCacheManager.clearLocalStorage('customer');
        break;
      
      case 'products':
        await this.invalidateQueries(['products']);
        browserCacheManager.clearLocalStorage('product');
        break;
      
      case 'auth':
        browserCacheManager.clearSupabaseCache();
        await this.invalidateQueries(['auth']);
        break;
    }

    console.log(`✅ ${feature} cache cleared`);
  }

  /**
   * Setup automatic cache clearing on errors
   */
  setupErrorHandling(): void {
    if (process.env.NODE_ENV === 'development') {
      // Listen for unhandled errors
      window.addEventListener('error', (event) => {
        browserCacheManager.clearOnError(event.error);
      });

      // Listen for unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        browserCacheManager.clearOnError(event.reason);
      });

      console.log('🔧 Development error handling setup completed');
    }
  }
}

export const developmentCacheService = new DevelopmentCacheService();

// Development-only global access
if (process.env.NODE_ENV === 'development') {
  (window as any).__clearAllCaches = () => developmentCacheService.clearAllDevelopmentCaches();
  (window as any).__clearFeatureCache = (feature: string) => developmentCacheService.clearFeatureCache(feature as any);
}
