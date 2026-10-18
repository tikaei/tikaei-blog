const CACHE_NAME = 'tikaei-pwa-v8';
const DYNAMIC_CACHE = 'tikaei-dynamic-v8';

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
  './images/banner-hub-mobile.webp',
  './images/banner-foto-desktop.webp',
  './images/banner-foto-mobile.webp',
  './images/banner-musik-desktop.webp',
  './images/banner-musik-mobile.webp',
  './images/banner-moto-desktop.webp',
  './images/banner-moto-mobile.webp'
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
  // Nur GET-Anfragen verarbeiten (POST, PUT etc. nicht cachen)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Nicht-HTTP(S) Anfragen ignorieren (z. B. chrome-extension:// von Erweiterungen)
  if (!url.protocol.startsWith('http')) return;

  // Google Analytics & Tag Manager ignorieren und direkt vom Browser verarbeiten lassen
  if (url.hostname.includes('google-analytics.com') || url.hostname.includes('googletagmanager.com')) {
    return;
  }

  // A) Navigationsseiten, Skripte & Stylesheets -> Network First mit Offline-Fallback
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
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;

          // Bei Navigation ohne Netz & ohne Cache-Treffer: Offline-Ersatzseite anzeigen
          if (event.request.mode === 'navigate') {
            return (await caches.match('./404.html')) || (await caches.match('./index.html'));
          }
        })
    );
    return;
  }

  // B) Externe Bilder & Feeds von Blogger/Google -> Stale-While-Revalidate
  if (url.hostname.includes('blogspot.com') || url.hostname.includes('googleusercontent.com')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Auch "opaque" Antworten (Status 0 bei Cross-Origin-Bildern) im Cache speichern
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
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
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      });
    })
  );
});
