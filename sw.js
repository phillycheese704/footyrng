/* RNG Football offline shell v11: no third-party requests or save-data changes. */
const CACHE_NAME = 'rng-football-offline-v11';
const APP_PAGE = new URL('./index.html', self.registration.scope).href;
const ASSETS = [
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
].map(path => new URL(path, self.registration.scope).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter(name => name.startsWith('rng-football-offline-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

const offlineResponse = async () => {
  const cache = await caches.open(CACHE_NAME);
  return (await cache.match(APP_PAGE)) ||
    new Response('<!doctype html><title>RNG Football offline</title><p>Open RNG Football online once to save it for offline use.</p>', {
      status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
};

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      try {
        const response = await fetch(request, { cache: 'no-store', signal: controller.signal });
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          event.waitUntil(cache.put(APP_PAGE, response.clone()).catch(() => {}));
          return response;
        }
      } catch (_) {
        // Connection unavailable: keep serving the fully offline game.
      } finally {
        clearTimeout(timeout);
      }
      return offlineResponse();
    })());
    return;
  }

  // Manifest and home-screen icons are cached along with the game on install.
  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    return fetch(request);
  })());
});
