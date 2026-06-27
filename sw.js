// Session Tool service worker.
// Network-first for the app page, so a new deploy shows up the next time the app
// loads while online (no more stale cached build). Falls back to cache when offline.
// skipWaiting + clients.claim mean a new version takes over immediately instead of
// waiting for every tab to close.

const CACHE = 'session-tool-v2';
const CORE = ['./', './index.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // don't wait for old tabs to close
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Lets the page (e.g. pull-to-refresh) tell a waiting worker to activate now.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isPage =
    req.mode === 'navigate' ||
    (url.origin === location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')));

  // App page: network-first so the freshest deploy wins; cache as a fallback.
  if (isPage) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Everything else (icons, fonts, etc.): serve cache fast, refresh in the background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && url.origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
