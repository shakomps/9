// Root-scoped service worker to precache site assets and serve them while offline.
const CACHE_NAME = 'shakomps-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/960/cache.html',
  '/960/bundle.js',
  '/960/imgg.jpg',
  '/style.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE.map(p => new Request(p, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
      .catch(err => console.error('SW install: cache.addAll failed', err)
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // Only handle GET requests
  if (req.method !== 'GET') return;

  // For navigation requests, prefer network then fallback to cache (network-first)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        // Update the cache with the latest HTML
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other requests same-origin: try network then cache fallback
  event.respondWith(
    fetch(req).then(res => {
      try {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      } catch (e) {}
      return res;
    }).catch(() => caches.match(req))
  );
});
