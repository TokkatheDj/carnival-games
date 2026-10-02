// Service Worker for Carnival Games
const CACHE = 'carnival-games-v1';
const ASSETS_CACHE = 'carnival-games-v1-assets';
const MAX_ASSETS = 60;

// Files to pre-cache on install (app shell only — not large game assets)
const SHELL = ['/', '/index.html'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== ASSETS_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  // Only handle same-origin GET requests
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  const url = new URL(request.url);

  // Navigation requests — network first, fall back to cached index
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(async r => {
          const c = await caches.open(CACHE);
          await c.put(request, r.clone());
          return r;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // JS/CSS/HTML — cache first
  if (/\.(js|css|html|woff2?|ttf)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(async r => {
          const c = await caches.open(CACHE);
          await c.put(request, r.clone());
          return r;
        });
      })
    );
    return;
  }

  // Images / audio / game assets — cache with size limit
  if (/\.(png|jpg|jpeg|gif|svg|webp|mp3|ogg|wav|json)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(async r => {
          const c = await caches.open(ASSETS_CACHE);
          const keys = await c.keys();
          if (keys.length >= MAX_ASSETS) await c.delete(keys[0]);
          await c.put(request, r.clone());
          return r;
        });
      })
    );
  }
});
