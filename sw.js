/* Session Tool — service worker.
 *
 * Strategy: NETWORK-FIRST for same-origin GET requests, with a cache fallback for
 * offline use. This means:
 *   • When you're online, the app always loads the freshest deploy (no more stale
 *     index.html stuck on your phone).
 *   • When you're offline, the app still opens from cache so you can view and log
 *     trades locally; they sync to the cloud the next time you're online.
 *
 * skipWaiting() + clients.claim() make every new deploy take over immediately
 * (no SW stuck in "waiting"), and old caches are deleted on activate so nothing
 * stale lingers. Bump CACHE on a deploy if you want to force-purge the old cache;
 * with network-first it isn't strictly required, but it's a clean habit.
 *
 * Cross-origin requests (Supabase, CDNs, TradingView, the economic calendar, fonts)
 * are intentionally NOT touched — they always go straight to the network so live
 * data is never served stale from cache.
 */
const CACHE = 'session-tool-v1';
const PRECACHE = ['./', './index.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Only handle same-origin assets; let everything else (Supabase, CDNs, etc.) pass through.
  if (url.origin !== self.location.origin) return;

  // Network-first: try the freshest copy, fall back to cache when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || caches.match('./index.html'))
      )
  );
});
