
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Enhanced cache control for development
    ...(mode === 'development' && {
      hmr: {
        overlay: true,
      },
      // Force cache busting in development
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }),
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Enhanced build configuration
  build: {
    // Clear output directory before build
    emptyOutDir: true,
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          tanstack: ['@tanstack/react-query'],
        },
      },
    },
  },
  // Enhanced caching configuration
  ...(mode === 'development' && {
    cacheDir: 'node_modules/.vite',
    optimizeDeps: {
      // Force re-optimization on certain conditions
      force: process.env.FORCE_OPTIMIZE === 'true',
      include: [
        'react',
        'react-dom',
        '@supabase/supabase-js',
        '@tanstack/react-query',
      ],
    },
  }),
  // Environment variables for cache control
  define: {
    __DEV_CACHE_VERSION__: JSON.stringify(Date.now()),
    __ENABLE_CACHE_DEBUGGING__: mode === 'development',
  },
}));
