/* Session Tool — service worker
 *
 * The important part: the app page (index.html) is fetched NETWORK-FIRST.
 * That means whenever you deploy a new index.html, the next load pulls the
 * fresh copy from the network — you are no longer stuck on an old cached page.
 * If the network is unavailable, it falls back to the last cached copy, so the
 * app still opens offline.
 *
 * Everything else same-origin is stale-while-revalidate (instant from cache,
 * quietly updated in the background). Cross-origin CDN requests (e.g. the
 * Twemoji emoji set) just go to the network and are cached opportunistically.
 *
 * DEPLOY NOTE: bumping CACHE_VERSION below is good hygiene (it clears old
 * caches and makes the new worker take over + reload once). But even if you
 * forget, network-first means the page itself still updates on the next load.
 */

const CACHE_VERSION = 'st-2026-07-16a';      // <-- bump this string on each deploy
const APP_CACHE     = CACHE_VERSION + '-app';
const RUNTIME_CACHE = CACHE_VERSION + '-rt';

// Precache the app shell so the very first offline open works.
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) =>
      // allSettled so a missing path never fails the whole install
      Promise.allSettled([cache.add('./'), cache.add('./index.html')])
    ).catch(() => {})
  );
});

// Take control immediately and drop caches from older versions.
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== APP_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

function isNavigation(request, url) {
  if (request.mode === 'navigate') return true;
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname.replace(/\/+$/, '');
  return path === '' || path.endsWith('/index.html');
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (e) { return; }

  // 1) The app page itself -> NETWORK FIRST (fresh deploys win; cache is the offline fallback).
  if (isNavigation(request, url)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(APP_CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(request)
            .then((r) => r || caches.match('./index.html'))
            .then((r) => r || caches.match('./'))
        )
    );
    return;
  }

  // 2) Cross-origin (CDNs: Twemoji, etc.) -> network, fall back to any cached copy.
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 3) Other same-origin assets -> stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// Optional: lets the page trigger an immediate update if it ever wants to.
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
