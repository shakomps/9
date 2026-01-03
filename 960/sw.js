// Simple service worker to precache the page and its assets so cache.html works offline.
// Place this sw.js in the same directory as cache.html (i.e. 960/sw.js) and register it from cache.html.

const CACHE_NAME = 'shakomps-cache-v1';
const ASSETS_TO_CACHE = [
  './cache.html',
  './bundle.js',
  './imgg.jpg',
  '../index.html', // adjust if your index.html path is different
  './'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Add all assets we expect to need offline
        return cache.addAll(ASSETS_TO_CACHE.map(path => new Request(path, { cache: 'reload' })));
      })
      .then(() => self.skipWaiting())
      .catch(err => {
        // swallow or surface errors for debugging
        console.error('SW install: cache.addAll failed', err);
      })
  );
});

self.addEventListener('activate', event => {
  // Clean up old caches if you bump CACHE_NAME
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Network-first for runtime requests, falling back to cache.
  const req = event.request;
  event.respondWith(
    fetch(req)
      .then(res => {
        // Optionally update cache for these requests
        try {
          if (req.method === 'GET' && req.url.startsWith(self.registration.scope)) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
        } catch (e) {
          // ignore errors during caching
        }
        return res;
      })
      .catch(() => {
        // if network fails, try cache
        return caches.match(req).then(cached => {
          if (cached) return cached;
          // fallback for navigation to a cached page
          if (req.mode === 'navigate') {
            return caches.match('./cache.html');
          }
          return Promise.reject('no-match-in-cache');
        });
      })
  );
});
