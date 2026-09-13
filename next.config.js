/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
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
