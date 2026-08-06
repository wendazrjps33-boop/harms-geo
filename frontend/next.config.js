/** @type {import('next').NextConfig} */
const nextConfig = {
  // TODO: Remove after TS migration complete (P1-3)
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'yourdomain.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig