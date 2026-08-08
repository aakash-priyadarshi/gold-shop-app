/** @type {import('next').NextConfig} */

const withPWA = require('@ducanh2912/next-pwa').default;

// When building for Tauri desktop, export static HTML (no Node server)
const isTauriBuild = process.env.TAURI_BUILD === '1';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@gold-shop/shared'],

  // Static export for Tauri desktop builds
  ...(isTauriBuild && { output: 'export', distDir: 'out' }),

  // Compress output for smaller bundles
  compress: true,

  images: {
    // Static export requires unoptimized images (no server-side optimization)
    ...(isTauriBuild && { unoptimized: true }),
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.orivraa.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Experimental performance features
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@heroicons/react/24/outline',
      '@heroicons/react/24/solid',
      'framer-motion',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
    ],
  },
  
  // Security + Performance headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.orivraa.com https://challenges.cloudflare.com https://va.vercel-scripts.com https://*.sentry-cdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.orivraa.com https://challenges.cloudflare.com https://*.sentry.io https://*.ingest.sentry.io wss:; worker-src 'self' blob:; frame-src 'self' https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self';",
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/brand/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/patterns/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Preconnect hints for external resources
      {
        source: '/',
        headers: [
          { key: 'Link', value: '<https://images.orivraa.com>; rel=preconnect' },
          { key: 'Link', value: '<https://res.cloudinary.com>; rel=preconnect' },
        ],
      },
    ];
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

// Wrap with PWA support. Disabled in development and for Tauri desktop builds
// (Tauri ships its own static bundle from a custom:// scheme where a service
// worker is unnecessary and can interfere). The service worker is generated at
// build time into /public/sw.js and precaches the app shell so the mobile
// PWA (and the future native app's webview) opens and works offline.
const withPWAConfigured = withPWA({
  dest: 'public',
  disable: isTauriBuild || process.env.NODE_ENV === 'development',
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    runtimeCaching: [
      {
        // API GET reads — serve cached data instantly, revalidate in background.
        urlPattern: ({ url, request }) =>
          request.method === 'GET' && /\/api\//.test(url.pathname),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-reads',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Images from the CDN.
        urlPattern: ({ url }) =>
          /images\.orivraa\.com|res\.cloudinary\.com/.test(url.hostname),
        handler: 'CacheFirst',
        options: {
          cacheName: 'cdn-images',
          expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        // Next.js static assets and fonts.
        urlPattern: ({ url }) => /\/_next\/static\//.test(url.pathname),
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
    ],
  },
});

module.exports = (() => {
  const base = withPWAConfigured(nextConfig);
  // Soft-wrap with Sentry when the SDK is installed. Source map upload runs only
  // when SENTRY_AUTH_TOKEN is present (CI / Vercel), so local builds stay fast.
  try {
    const { withSentryConfig } = require("@sentry/nextjs");
    return withSentryConfig(base, {
      org: process.env.SENTRY_ORG || "aakash-priyadarshi",
      project: process.env.SENTRY_PROJECT || "orivraa-web",
      silent: true,
      widenClientFileUpload: true,
      disableLogger: true,
      automaticVercelMonitors: true,
      sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
      },
    });
  } catch {
    return base;
  }
})();
