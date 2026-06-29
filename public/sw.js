/*
 * JobWize service worker — dependency-free, no build step.
 *
 * Strategy:
 *   - navigation requests (mode === 'navigate'): network-first, falling back
 *     to the cached `/offline` page when the network is unavailable.
 *   - same-origin static assets (icons, manifest): cache-first.
 *   - everything else (cross-origin, Supabase auth/API, non-GET): passed
 *     straight through to the network and never cached.
 */

const CACHE_VERSION = "jobwize-v1";

// Files that make up the minimal offline app shell.
const APP_SHELL = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/maskable.svg",
  "/icons/apple-touch-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      // Pre-caching is best-effort; a single missing asset must not block install.
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever touch GET requests — never cache auth/API mutations.
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Leave cross-origin traffic (Supabase, Google auth, analytics, etc.) alone.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigation requests: network-first, fall back to the offline shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Keep the latest copy of visited pages for future offline use.
          const copy = response.clone();
          caches
            .open(CACHE_VERSION)
            .then((cache) => cache.put(request, copy))
            .catch(() => {});
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/offline"))
        )
    );
    return;
  }

  // Same-origin static assets: cache-first.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        // Cache successful, basic (same-origin) responses only.
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();
          caches
            .open(CACHE_VERSION)
            .then((cache) => cache.put(request, copy))
            .catch(() => {});
        }
        return response;
      });
    })
  );
});
