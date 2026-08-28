/* eslint-disable no-restricted-globals */
// Service Worker for Timeless Baazar PWA

// v3: fonts are self-hosted now and joined the precache. Bumping the name makes
// the activate handler drop v2, so nobody is left holding a cache that has the
// old Google Fonts-era shell in it.
const CACHE_NAME = 'timeless-baazar-v3';

// Sirf wahi files jo build output me guaranteed hain. Hashed JS/CSS runtime par
// fetch handler cache karta hai. cache.addAll() atomic hai -- ek 404 poori
// precache gira deta hai, isliye yahan kuch bhi speculative mat daalna.
const urlsToCache = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  // Self-hosted, always needed, and guaranteed in the build output because they
  // are copied verbatim from public/. The other two font files are deliberately
  // left out: unicode-range means most visitors never fetch them at all.
  '/fonts/inter-latin.woff2',
  '/fonts/inter-rupee.woff2'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('[Service Worker] Caching failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
// Navigations: network-first, taki naya deploy turant mile (cache-first me user
// hamesha purana index.html dekhta reh jaata tha).
// Static assets: cache-first, kyunki unke naam hashed hain -- badle to naam badlega.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // GET ke alawa kuch bhi cache mat karo (orders, auth, Sheets ke POST).
  if (request.method !== 'GET') return;

  // Cross-origin (Firebase, Google Sheets, the API) seedha network par jaaye.
  // Fonts ab same-origin hain, to woh neeche cache-first handler me jaate hain.
  if (new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});

// Push notification event (for future use)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Timeless Baazar';
  const options = {
    body: data.body || 'New update available!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'timeless-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// index.js naya version milne par SKIP_WAITING bhejta hai -- pehle iska koi
// listener hi nahi tha, isliye update kabhi activate nahi hota tha.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
