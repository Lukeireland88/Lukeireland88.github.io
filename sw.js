const CACHE_NAME = 'karaoke-songbook-v2';

// Shell assets only — songs.js is very large and is fetched at runtime.
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app-logic.js',
  './site.webmanifest',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(urlsToCache).catch(() => {
        /* Offline shell may partially fail; still activate */
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => cached || new Response('', { status: 503, statusText: 'Offline' }));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      )
    )
  );
  self.clients.claim();
});
