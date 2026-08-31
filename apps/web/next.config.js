/** @type {import('next').NextConfig} */

const withPWA = require('@ducanh2912/next-pwa').default;

// Dependency chain: @ducanh2912/next-pwa@10.2.9 -> workbox-webpack-plugin@7.1.0
// -> workbox-core@7.1.0. Workbox 7.1.0 intentionally retains `7.0.0` in its
// generated `workbox:*` diagnostic markers, so public/workbox-*.js must only
// be refreshed by this build and never hand-edited to change that marker.

// When building for Tauri desktop, export static HTML (no Node server)
const isTauriBuild = process.env.TAURI_BUILD === '1';

function getConfiguredApiConnectSource(value) {
  if (!value) return '';

  try {
    const url = new URL(value);
    const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(
      url.hostname,
    );
    if (
      url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && isLoopback)
    ) {
      return '';
    }
    return url.origin;
  } catch {
    return '';
  }
}

const configuredApiConnectSource = getConfiguredApiConnectSource(
  process.env.NEXT_PUBLIC_API_URL,
);
const contentSecurityPolicy =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.orivraa.com https://challenges.cloudflare.com https://static.cloudflareinsights.com https://va.vercel-scripts.com https://*.sentry-cdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.orivraa.com https://challenges.cloudflare.com https://cloudflareinsights.com https://*.cloudflareinsights.com https://static.cloudflareinsights.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io wss:" +
  (configuredApiConnectSource ? ` ${configuredApiConnectSource}` : '') +
  "; worker-src 'self' blob:; media-src 'self' blob: https://images.orivraa.com; frame-src 'self' https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self';";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@gold-shop/shared'],

  // Static export for Tauri desktop builds
  ...(isTauriBuild && { output: 'export', distDir: 'out' }),

  // Production web deployments run as a self-contained Node server. This is
  // required by Railway while preserving the static Tauri export above.
  ...(!isTauriBuild && { output: 'standalone' }),

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
            value: 'camera=(self), microphone=(), geolocation=(self)',
          },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/brand/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/patterns/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Preconnect hints for external resources
      {
        source: '/',
        headers: [
          {
            key: 'Link',
            value: '<https://images.orivraa.com>; rel=preconnect',
          },
          {
            key: 'Link',
            value: '<https://res.cloudinary.com>; rel=preconnect',
          },
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
  register: false,
  // Navigation HTML must come from the current deploy. Caching an old app
  // shell is what leaves clients requesting chunks removed by a new release.
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        // Invoice PDFs are generated on-demand (logo + QR can take >5s).
        // Never cache them — NetworkFirst + status 0 poisoned the download.
        urlPattern: ({ url, request }) =>
          request.method === 'GET' &&
          /\/api\/invoices\/[^/]+\/pdf(\?|$)/.test(url.pathname),
        handler: 'NetworkOnly',
        options: {
          cacheName: 'invoice-pdfs',
        },
      },
      {
        // Authenticated API reads must never be persisted in a shared browser
        // cache because another account may subsequently use this device.
        urlPattern: ({ url, request }) =>
          request.method === 'GET' &&
          /\/api\//.test(url.pathname) &&
          !/\/api\/invoices\/[^/]+\/pdf(\?|$)/.test(url.pathname),
        handler: 'NetworkOnly',
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
        // Revalidate Next.js assets on each use so a newly deployed app shell
        // cannot be held behind a month-old service-worker response.
        urlPattern: ({ url }) => /\/_next\/static\//.test(url.pathname),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'next-static',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
          cacheableResponse: { statuses: [200] },
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
    const { withSentryConfig } = require('@sentry/nextjs');
    return withSentryConfig(base, {
      org: process.env.SENTRY_ORG || 'aakash-priyadarshi',
      project: process.env.SENTRY_PROJECT || 'orivraa-web',
      silent: true,
      widenClientFileUpload: true,
      disableLogger: true,
      automaticVercelMonitors: true,
      // Bypass ad blockers by proxying events through our domain
      tunnelRoute: '/monitoring',
      sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
      },
    });
  } catch {
    return base;
  }
})();
