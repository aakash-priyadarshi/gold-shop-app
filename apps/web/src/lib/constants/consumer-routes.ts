/**
 * Single source of truth for the B2C consumer surface area.
 *
 * These top-level route segments make up the consumer-facing marketplace
 * (browsing shops, viewing designs, cart, checkout). They are gated in two
 * places that MUST stay in sync:
 *   1. The Next.js edge middleware (redirects them when the consumer flow is
 *      disabled — see apps/web/src/middleware.ts).
 *   2. A per-route <CustomerFlowGuard> layout (client-side redirect).
 *
 * When adding a new consumer route, add its top-level segment here AND wrap the
 * route with <CustomerFlowGuard> in its layout.tsx.
 */
export const CONSUMER_TOP_SEGMENTS = [
  "cart",
  "checkout",
  "designs",
  "shops",
  "shop",
] as const;

export type ConsumerTopSegment = (typeof CONSUMER_TOP_SEGMENTS)[number];

/** Set form for O(1) membership checks (e.g. in middleware). */
export const CONSUMER_TOP_SEGMENT_SET: ReadonlySet<string> = new Set(
  CONSUMER_TOP_SEGMENTS,
);
