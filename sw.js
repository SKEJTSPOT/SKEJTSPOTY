const CACHE_NAME = 'Skejtspoty';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  // Tutaj możesz dodać inne pliki, np. '/style.css', '/script.js'
];

// Instalacja Service Workera
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Otwieranie pamięci podręcznej (cache)');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Pobieranie danych (działa offline)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
