// sw.js
const CACHE_NAME = 'skejty-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js'
];

// Instalacja Service Workera
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Obsługa plików offline (wymagane przez Chrome)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
