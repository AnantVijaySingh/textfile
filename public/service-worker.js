// A unique name for our app's cache.
const CACHE_NAME = 'textfile-me-cache-v1';

// FILES_TO_CACHE is a list of all the essential files your app needs to run offline.
// We are now adding the Tabular font files.
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/fonts/Tabular-Medium.woff',
  '/fonts/Tabular-Semibold.woff'
];

// --- Service Worker Event Listeners ---

// The 'install' event is fired when the service worker is first installed.
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  // We block the installation until the cache is pre-filled.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline page');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  // This forces the waiting service worker to become the active service worker.
  self.skipWaiting();
});

// The 'activate' event is fired when the service worker becomes active.
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  // This removes old, unused caches.
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // This makes the service worker take control of the page immediately.
  self.clients.claim();
});

// The 'fetch' event is fired every time the app requests a resource (like a page or an image).
self.addEventListener('fetch', (event) => {
  console.log(`[Service Worker] Fetching resource: ${event.request.url}`);
  // We respond to the request by trying to find a matching resource in the cache.
  event.respondWith(
    caches.match(event.request).then((response) => {
      // If the resource is in the cache, we return it. Otherwise, we fetch it from the network.
      return response || fetch(event.request);
    })
  );
});

