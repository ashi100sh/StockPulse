const CACHE = 'ptf-v4';
const STATIC = ['./manifest.json']; // index.html intentionally excluded — always fetch fresh

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
  const url = e.request.url;

  // Navigation (HTML pages) — always fetch fresh, never serve from cache
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() =>
      new Response('<h1>Offline</h1>', { status: 503, headers: { 'Content-Type': 'text/html' } })
    ));
    return;
  }

  // API / proxy calls — network only, no caching
  if (url.includes('allorigins') || url.includes('corsproxy') || url.includes('yahoo') || url.includes('codetabs')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Static assets — cache first, fallback to network
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() =>
      new Response('Offline', { status: 503 })
    ))
  );
});
