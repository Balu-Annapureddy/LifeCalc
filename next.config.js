/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        // Service worker must never be served from HTTP cache.
        // Without this the browser can serve a stale sw.js for up to 24 h
        // (the HTTP spec cap for SW script caching), delaying new deployments.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/calculators/everyday/fuel-cost',
        destination: '/calculators/money/fuel-cost',
        permanent: true,
      },
      {
        source: '/calculators/everyday',
        destination: '/calculators/money',
        permanent: true,
      },
      {
        source: '/calculators/technology',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
