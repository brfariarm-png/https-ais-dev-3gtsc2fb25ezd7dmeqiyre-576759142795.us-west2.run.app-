// Service Worker for Sorveteria Supreme (PWA compliance)
const CACHE_NAME = 'supreme-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Avoid failing worker activation if some files are being bundled or not found
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('Pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Only intercept HTTP/HTTPS GET requests to prevent crashes from browser extensions, non-GET or data scheme URLs
  if (!e.request.url.startsWith('http') || e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
