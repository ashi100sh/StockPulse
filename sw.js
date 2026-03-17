const CACHE = 'ptf-v2';
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
  // For API calls — always network, fallback to cache or error response
  if (e.request.url.includes('corsproxy') || e.request.url.includes('allorigins') ||
      e.request.url.includes('codetabs') || e.request.url.includes('yahoo')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(e.request).then(r => r || new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } }))
      )
    );
    return;
  }
  // For app shell — cache first, fallback to network
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() =>
      new Response('Offline', { status: 503 })
    ))
  );
});
