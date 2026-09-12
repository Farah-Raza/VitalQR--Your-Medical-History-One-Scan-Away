/*
 * VitalQR service worker.
 *
 * Scope is deliberately narrow. It makes the app installable and lets the
 * shell open without a network, and that is all.
 *
 * What it must never do: cache anything under /api/. Those responses are
 * medical records, they are sent with `Cache-Control: no-store`, and a
 * responder reading a stale allergy list off a cache is exactly the failure
 * this project exists to prevent. The documented answer to "no internet" is
 * the printed fallback card, not a stale cache.
 */

const VERSION = 'vitalqr-v1';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;

const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // addAll is atomic: one 404 would throw away the whole install, and a
      // missing icon should not stop the app from being installable.
      .then((cache) => Promise.allSettled(SHELL_URLS.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Same-origin only. Never touch the API, and never touch another origin
  // (the deployed API lives on a different host).
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network first, so a scan always reflects the live profile.
  // Fall back to the cached shell only when the network is genuinely gone,
  // which lets the app open offline and show its own offline messaging.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || Response.error()))
    );
    return;
  }

  // Build output is content-hashed and immutable, so cache-first is safe
  // and makes a repeat launch instant.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(ASSETS).then((c) => c.put(request, copy)).catch(() => {});
            }
            return res;
          })
      )
    );
  }
});
