const CACHE_NAME = 'tikaei-pwa-v3';
const DYNAMIC_CACHE = 'tikaei-dynamic-v3';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './photography.html',
  './music.html',
  './moto.html',
  './disclaimer.html',
  './404.html',
  './style.css',
  './script.js',
  './posts.json',
  './manifest.json',
  './images/favicon.png',
  './images/logo.png',
  './images/banner-hub-desktop.webp',
  './images/banner-hub-mobile.webp'
];

/* 1. Installation: App-Shell & statische Assets im Cache ablegen */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

/* 2. Aktivierung: Alte Caches aufräumen */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/* 3. Fetch-Events intelligent verwalten */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // A) Navigationsseiten, Skripte & Stylesheets -> Network First (aktuelle Updates vorziehen)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
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

  // B) Externe Bilder & Feeds von Blogger/Google -> Stale-While-Revalidate (schnelles Laden aus Cache + Aktualisierung im Hintergrund)
  if (url.hostname.includes('blogspot.com') || url.hostname.includes('googleusercontent.com')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // C) Alle sonstigen statischen Assets -> Cache First, Fallback Network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      });
    })
  );
});
