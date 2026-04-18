/**
 * Network-first caching: after deploy, clients pick up new HTML/CSS/JS on refresh
 * without needing a hard cache clear. Offline: falls back to last good copy in Cache Storage.
 *
 * After each deploy that changes HTML/CSS/JS, bump CACHE_NAME and the ?v= on
 * asset URLs in index.html so clients drop old cached copies quickly.
 */
const CACHE_NAME = 'karaoke-songbook-v10';

const urlsToCache = [
  './',
  './index.html',
  './styles.css?v=10',
  './app-logic.js?v=10',
  './site.webmanifest',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(urlsToCache).catch(() => {
        /* Precache is best-effort; fetch handler still works online */
      })
    )
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    /* CDNs, fonts: browser default caching */
    return;
  }

  event.respondWith(networkFirstWithOfflineFallback(event.request));
});

async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request, {
      cache: 'no-cache',
      credentials: 'same-origin'
    });

    if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
      const copy = networkResponse.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }

    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}
