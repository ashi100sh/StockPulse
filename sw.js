const CACHE = 'ptf-v1';
const STATIC = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // For API calls (corsproxy) — always network, fallback to cache
  if (e.request.url.includes('corsproxy') || e.request.url.includes('yahoo')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // For app shell — cache first
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
