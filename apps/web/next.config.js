/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@gold-shop/shared'],
  images: {
    domains: ['localhost', 'res.cloudinary.com'],
  },
  // Only use rewrites in development - in production, api.ts uses NEXT_PUBLIC_API_URL directly
  async rewrites() {
    // In production, don't rewrite - the frontend makes direct calls to the API
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    // In development, proxy to local API
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
