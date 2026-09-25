const CACHE_NAME = 'tikaei-pwa-v1';
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
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Blogger-Feeds immer direkt aus dem Netzwerk laden (da über localStorage gehandhabt)
  if (event.request.url.includes('blogspot.com') || event.request.url.includes('google')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
