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
