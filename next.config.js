/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      resolveAlias: {},
    },
  },
  output: 'standalone',
};

module.exports = nextConfig;
