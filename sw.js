const CACHE_NAME = 'tikaei-pwa-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/photography.html',
  '/music.html',
  '/moto.html',
  '/disclaimer.html',
  '/404.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/images/favicon.png',
  '/images/logo.png',
  '/images/banner-hub.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('blogspot.com') || event.request.url.includes('google')) {
    return;
  }

  // Network-First für Skripte und Stylesheets, damit Updates sofort greifen
  if (event.request.mode === 'navigate' || event.request.url.endsWith('.js') || event.request.url.endsWith('.css')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
