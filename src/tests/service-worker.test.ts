/**
 * Service Worker Caching Strategy Tests
 *
 * Validates the three-tier caching strategy in public/sw.js:
 *   - API routes        → Network Only (SW does not intercept)
 *   - /_next/static/    → Cache First (immutable, content-hashed)
 *   - HTML navigation   → Network First (fresh when online, cached offline fallback)
 *
 * These are unit tests for the strategy logic — we verify the CACHE_VERSION
 * constant, the routing decisions, and the activation/eviction behavior by
 * reading and parsing the actual sw.js source rather than running it in a
 * full browser context.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const SW_PATH = join(process.cwd(), 'public', 'sw.js');
const swSource = readFileSync(SW_PATH, 'utf8');

describe('Service Worker — Caching Strategy Compliance', () => {
  it('1. CACHE_VERSION constant is present and non-empty', () => {
    const match = swSource.match(/const CACHE_VERSION\s*=\s*['"](.+?)['"]/);
    expect(match).not.toBeNull();
    const version = match![1];
    expect(version.length).toBeGreaterThan(0);
  });

  it('2. Cache names include CACHE_VERSION to enable eviction on update', () => {
    expect(swSource).toContain('lifecalc-static-');
    expect(swSource).toContain('lifecalc-nav-');
    // Both names must embed CACHE_VERSION via template literal or concatenation
    expect(swSource).toMatch(/lifecalc-static-.*CACHE_VERSION|`lifecalc-static-\$\{CACHE_VERSION\}`/);
    expect(swSource).toMatch(/lifecalc-nav-.*CACHE_VERSION|`lifecalc-nav-\$\{CACHE_VERSION\}`/);
  });

  it('3. API routes are never intercepted (Network Only)', () => {
    // The SW must explicitly skip /api/ routes by returning without respondWith
    expect(swSource).toContain("url.pathname.startsWith('/api/')");
    // Must return early (not call respondWith) for API routes
    const apiSection = swSource.substring(
      swSource.indexOf("startsWith('/api/')"),
      swSource.indexOf("startsWith('/api/')") + 100
    );
    expect(apiSection).toContain('return');
  });

  it('4. /_next/static/ assets use Cache First strategy', () => {
    expect(swSource).toContain("url.pathname.startsWith('/_next/static/')");
    // Cache First: check cache before fetching
    const staticSection = swSource.substring(
      swSource.indexOf("'/_next/static/'"),
      swSource.indexOf("'/_next/static/'") + 600
    );
    // Must call cache.match before fetch
    expect(staticSection).toContain('cache.match');
    expect(staticSection).toContain('fetch(event.request)');
  });

  it('5. HTML navigation requests use Network First strategy', () => {
    // The SW must detect navigation mode or text/html accept header
    expect(swSource).toContain("request.mode === 'navigate'");
    expect(swSource).toContain('text/html');
    // Network First: fetch first, cache fallback on error
    expect(swSource).toContain('networkFirstNav');
    const navFn = swSource.substring(
      swSource.indexOf('async function networkFirstNav'),
      swSource.indexOf('async function networkFirstNav') + 800
    );
    // Must attempt fetch first
    expect(navFn).toContain('await fetch(request)');
    // Must fall back to cache on error
    expect(navFn).toContain('caches.match');
    expect(navFn).toContain('catch');
  });

  it('6. skipWaiting() is called during install (immediate activation)', () => {
    expect(swSource).toContain('self.skipWaiting()');
    // Must be within the install listener
    const installSection = swSource.substring(
      swSource.indexOf("addEventListener('install'"),
      swSource.indexOf("addEventListener('activate'")
    );
    expect(installSection).toContain('skipWaiting');
  });

  it('7. clients.claim() is called during activate (take control of existing tabs)', () => {
    expect(swSource).toContain('self.clients.claim()');
    const activateSection = swSource.substring(
      swSource.indexOf("addEventListener('activate'"),
      swSource.indexOf("addEventListener('fetch'")
    );
    expect(activateSection).toContain('clients.claim');
  });

  it('8. Activate handler evicts caches from previous CACHE_VERSIONs', () => {
    const activateSection = swSource.substring(
      swSource.indexOf("addEventListener('activate'"),
      swSource.indexOf("addEventListener('fetch'")
    );
    // Must delete caches that do not match current version caches
    expect(activateSection).toContain('caches.delete');
    expect(activateSection).toContain('STATIC_CACHE');
    expect(activateSection).toContain('NAV_CACHE');
  });

  it('9. Non-same-origin requests are not intercepted', () => {
    // SW must guard against cross-origin requests
    expect(swSource).toContain("url.origin !== self.location.origin");
    const originCheck = swSource.substring(
      swSource.indexOf("url.origin !== self.location.origin"),
      swSource.indexOf("url.origin !== self.location.origin") + 20
    );
    expect(originCheck.length).toBeGreaterThan(0);
  });

  it('10. Navigation cache is updated with fresh HTML on successful network response', () => {
    const navFn = swSource.substring(
      swSource.indexOf('async function networkFirstNav'),
      swSource.indexOf('async function networkFirstNav') + 800
    );
    // After successful fetch, must put response into cache
    expect(navFn).toContain('cache.put');
    expect(navFn).toContain('networkResponse.clone()');
  });
});
