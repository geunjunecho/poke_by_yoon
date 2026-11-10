const CACHE_NAME = 'pokedex-v8';
const STATIC_ASSETS = [
  './',
  './index.html',
  './pokemon.html',
  './style.css',
  './css/minigames.css',
  './js/api.js',
  './js/app.js',
  './js/minigames-core.js',
  './js/games/poke-runner.js',
  './js/games/poke-berry.js',
  './js/games/poke-catch.js',
  './js/games/poke-seesaw.js',
  './js/games/poke-memory.js',
  './js/games/poke-flipbattle.js',
  './tiniping/index.html',
  './tiniping/style.css',
  './tiniping/data.json',
  './tiniping/css/minigames.css',
  './tiniping/js/app.js',
  './tiniping/js/minigames-core.js',
  './tiniping/js/games/tp-runner.js',
  './tiniping/js/games/tp-parfait.js',
  './tiniping/js/games/tp-bubble.js',
  './tiniping/js/games/tp-memory.js',
  './tiniping/js/games/tp-flipbattle.js',
  './manifest.json'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API requests: network first, cache fallback
  if (url.hostname === 'pokeapi.co') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Pokemon sprites/images: cache first
  if (url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  // Static assets: network first, cache fallback (prevents stale HTML/JS on deploy)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
