
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { developmentCacheService } from '@/services/developmentCacheService';

// Type definition for hot module replacement
declare global {
  interface NodeModule {
    hot?: {
      accept(callback?: () => void): void;
    };
  }
}

/**
 * Development cache management hook
 * Automatically sets up cache management in development mode
 */
export function useDevelopmentCache() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Initialize the development cache service
      developmentCacheService.setQueryClient(queryClient);
      developmentCacheService.setupErrorHandling();

      // Add helpful console messages
      console.log('🔧 Development Cache Management Active');
      console.log('Available commands:');
      console.log('  __clearAllCaches() - Clear all caches');
      console.log('  __clearFeatureCache("orders") - Clear specific feature cache');
      console.log('  __clearCache() - Clear browser caches only');
      console.log('  __clearSupabaseCache() - Clear Supabase auth cache');

      // Optional: Clear cache on hot reload (if available)
      if (typeof module !== 'undefined' && module.hot) {
        module.hot.accept(() => {
          console.log('🔄 Hot reload detected, clearing relevant caches...');
          developmentCacheService.clearReactQueryCache();
        });
      }
    }
  }, [queryClient]);

  return {
    clearAllCaches: developmentCacheService.clearAllDevelopmentCaches.bind(developmentCacheService),
    clearFeatureCache: developmentCacheService.clearFeatureCache.bind(developmentCacheService),
    clearReactQueryCache: developmentCacheService.clearReactQueryCache.bind(developmentCacheService),
  };
}
