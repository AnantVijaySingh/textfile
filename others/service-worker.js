// A service worker is a script that runs in the background, separate from your web page.
// It allows for features like offline support and push notifications.

// --- Cache Setup ---

// CACHE_NAME is a unique identifier for our app's cache.
// It's a good practice to include a version number. If you update your app's
// files later, you can change this version number, which will trigger
// the service worker to fetch the new files.
const CACHE_NAME = 'textfile-me-cache-v2'; // Bump version to trigger re-caching

// FILES_TO_CACHE is a list of all the essential files your app needs to run offline.
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/fonts/Tabular-Medium.woff',
  '/fonts/Tabular-Semibold.woff'
];

// --- Service Worker Event Listeners ---

// 1. The 'install' event
// This event fires when the service worker is first installed.
// It's the perfect time to open our cache and store the essential files.
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  
  // event.waitUntil() ensures that the service worker will not install until
  // the code inside has successfully completed.
  event.waitUntil(
    // caches.open() opens a cache with the given name.
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        // cache.addAll() takes a list of URLs, fetches them, and adds
        // the responses to the cache. This is an "atomic" operation – if any
        // file fails to fetch, the entire operation fails.
        return cache.addAll(FILES_TO_CACHE);
      })
  );
});


// 2. The 'activate' event
// This event fires after the service worker is installed and ready to take control.
// It's a good place to clean up old caches from previous versions of the service worker.
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        // If the cache name is not our current one, we delete it.
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // This line tells the service worker to take control of the page immediately.
  return self.clients.claim();
});


// 3. The 'fetch' event
// This event fires every time the app makes a network request (e.g., for a file, an image, etc.).
// We intercept this request to provide a file from the cache if it's available.
self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  // For requests to our own domain, we use a "cache-first" strategy.
  // This means we check the cache first. If we find the file, we serve it.
  // If not, we fetch it from the network, cache it, and then serve it.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Check if the request is in our cache.
      const response = await cache.match(event.request);
      
      // If it is, return the cached response.
      if (response) {
        return response;
      }

      // If not in cache, fetch from the network.
      const fetchResponse = await fetch(event.request);

      // IMPORTANT: Only cache valid responses (not errors, opaque responses, etc.)
      // and only cache requests from our own origin to be safe.
      if (
        !fetchResponse ||
        fetchResponse.status !== 200 ||
        fetchResponse.type !== 'basic' ||
        !event.request.url.startsWith(self.origin)
      ) {
        return fetchResponse;
      }
      
      // Clone the response because a response is a "stream" and can only be consumed once.
      // We need one copy for the browser to render and one to put in the cache.
      await cache.put(event.request, fetchResponse.clone());

      return fetchResponse;
    })
  );
});

