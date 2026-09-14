// LifeCalc Service Worker — Static Architecture Caching Strategy
//
// Caching tiers:
//   1. /_next/static/      → Cache First  (content-hashed, immutable)
//   2. HTML navigation     → Network First (always fresh when online; cached for offline fallback)
//   3. Other static assets → Network First with cache fallback
//
// CACHE_VERSION must be updated with each deployment that changes the app shell.
const CACHE_VERSION = 'v4';
const STATIC_CACHE  = `lifecalc-static-${CACHE_VERSION}`;  // for /_next/static/ immutable assets
const NAV_CACHE     = `lifecalc-nav-${CACHE_VERSION}`;     // for HTML navigation fallback

// Maximum age for a cached navigation response before it is considered stale
// for offline purposes.  Does not affect online behavior (Network First always
// fetches from the network when connectivity is available).
const NAV_CACHE_MAX_ENTRIES = 30;

// ─── Install ───────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  // Take control immediately; do not wait for old SW clients to close.
  self.skipWaiting();
  // Warm the navigation cache with the app shell root.
  event.waitUntil(
    caches.open(NAV_CACHE).then(cache => cache.add('/'))
  );
});

// ─── Activate ──────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          // Delete any cache that does not belong to the current CACHE_VERSION.
          // This evicts all stale HTML and static assets from previous deployments.
          if (key !== STATIC_CACHE && key !== NAV_CACHE) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  // Only intercept GET requests on the same origin.
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Defensive guard: never intercept API requests if ever introduced
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // ── Tier 2: Immutable static assets — Cache First ──────────────────────
  // Next.js content-hashes every file under /_next/static/.
  // The URL itself changes when the content changes, so Cache First is safe.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // ── Tier 3: HTML navigation — Network First ─────────────────────────────
  // Always attempt the network first so users always receive the current
  // deployed HTML.  Only fall back to the cache when offline.
  const isNavigation =
    event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html');

  if (isNavigation) {
    event.respondWith(networkFirstNav(event.request));
    return;
  }

  // ── Tier 4: Other same-origin GET (icons, manifest, fonts) ─────────────
  // Network First with a cache fallback so these work offline.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(NAV_CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ─── Network First for navigation requests ─────────────────────────────────
async function networkFirstNav(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      // Update the cache with the freshly fetched HTML.
      const cache = await caches.open(NAV_CACHE);
      cache.put(request, networkResponse.clone());
      await trimCache(cache, NAV_CACHE_MAX_ENTRIES);
    }
    return networkResponse;
  } catch (_) {
    // Network unavailable — serve the last cached HTML for this URL.
    const cached = await caches.match(request);
    if (cached) return cached;
    // Last resort: serve the cached root shell.
    return caches.match('/');
  }
}

// ─── Cache size trimming ───────────────────────────────────────────────────
// Prevents the navigation cache growing without bound on sites with many pages.
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map(k => cache.delete(k)));
  }
}
