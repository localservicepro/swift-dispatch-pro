// Service Worker for SwiftDispatch Pro
const CACHE_VERSION = '1'; // Static version to prevent reload loops
const CACHE_NAME = `swiftdispatch-v${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `swiftdispatch-static-v${CACHE_VERSION}`;

const urlsToCache = [
  '/',
  '/index.css'
];

// Install event
self.addEventListener('install', event => {
  console.log('[SW] Installing new version');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static resources');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating new version');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches
          if (cacheName.startsWith('swiftdispatch-') && 
              cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - Network first for HTML, cache first for assets
self.addEventListener('fetch', event => {
  const request = event.request;
  
  // Network first strategy for HTML documents (ensures fresh content)
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone response before caching
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }
  
  // Cache first strategy for static assets
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone response before caching
          const responseToCache = response.clone();
          caches.open(STATIC_CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
          
          return response;
        });
      })
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // Focus the app if it's already open, otherwise open it
  event.waitUntil(
    clients.matchAll().then(clientList => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});