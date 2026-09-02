/** Public about pages — keep in sync with apps/web/src/data/about-i18n.ts */
export const SEO_AUDIT_ABOUT_LANGS = [
  "fr",
  "de",
  "hi",
  "es",
  "ar",
  "ne",
  "gu",
  "mr",
  "ta",
  "te",
  "kn",
  "si",
  "he",
  "yi",
] as const;

export const SEO_AUDIT_EXCLUDED_EXACT = new Set([
  "/m",
  "/sentry-example-page",
  "/recovery/pro",
]);

export const SEO_AUDIT_EXCLUDED_PREFIXES = [
  "/dashboard",
  "/m/",
  "/auth/",
  "/payment/",
  "/recovery/",
];

/** Routes that only apply when customer marketplace flow is enabled. */
export const SEO_AUDIT_B2C_ROUTE_PREFIXES = ["/shop", "/shops", "/designs"];

export const SEO_AUDIT_SUPPLEMENTAL_ROUTES = [
  "/blog",
  ...SEO_AUDIT_ABOUT_LANGS.map((lang) => `/about/${lang}`),
];

export const SEO_AUDIT_FALLBACK_ROUTES = [
  "/",
  "/about",
  "/ai-integration",
  "/ai-sales-team",
  "/ask-ai",
  "/blog",
  "/compare/billing-software-india-jewellery-shops",
  "/compare/jewellery-crm-software-india",
  "/compare/orivraa-vs-jewel360",
  "/compare/orivraa-vs-lightspeed",
  "/compare/orivraa-vs-marg-erp",
  "/compare/orivraa-vs-sortly",
  "/compare/orivraa-vs-tally",
  "/compare/orivraa-vs-the-edge",
  "/compare/orivraa-vs-vyapar",
  "/compare/orivraa-vs-zoho-inventory",
  "/contact",
  "/demo",
  "/download",
  "/download/changelog",
  "/eu/jewellery-shop-software",
  "/for-sellers",
  "/help",
  "/jewellery-ecommerce-software",
  "/jewellery-inventory-software",
  "/jewellery-manufacturing-software",
  "/jewellery-pos-software",
  "/jewellery-shop-billing-software",
  "/jewellery-shop-software",
  "/jewellery-store-management-software",
  "/lk/jewellery-shop-software",
  "/np/jewellery-shop-software",
  "/partner",
  "/platform-guidelines",
  "/pricing",
  "/privacy",
  "/refund",
  "/security",
  "/seller-guide",
  "/support",
  "/terms",
  "/tutorial",
  "/tutorial/ar",
  "/tutorial/de",
  "/tutorial/es",
  "/tutorial/fr",
  "/tutorial/gu",
  "/tutorial/hi",
  "/tutorial/kn",
  "/tutorial/mr",
  "/tutorial/ne",
  "/tutorial/ta",
  "/tutorial/te",
  "/uae/jewellery-shop-software",
  "/uk/jewellery-shop-software",
  "/us/jewelry-store-software",
  ...SEO_AUDIT_SUPPLEMENTAL_ROUTES.filter((route) => route !== "/blog"),
];

function isExcludedRoute(route: string): boolean {
  if (SEO_AUDIT_EXCLUDED_EXACT.has(route)) return true;
  return SEO_AUDIT_EXCLUDED_PREFIXES.some((prefix) => route.startsWith(prefix));
}

function isB2cRoute(route: string): boolean {
  return SEO_AUDIT_B2C_ROUTE_PREFIXES.some(
    (prefix) => route === prefix || route.startsWith(`${prefix}/`),
  );
}

export function buildSeoAuditPathList(
  generatedRoutes: string[],
  options: { customerFlowEnabled: boolean; useFallback: boolean },
): string[] {
  const pathsSet = new Set<string>();

  const baseRoutes =
    generatedRoutes.length > 0 && !options.useFallback
      ? generatedRoutes
      : SEO_AUDIT_FALLBACK_ROUTES;

  for (const route of baseRoutes) {
    if (!isExcludedRoute(route)) {
      pathsSet.add(route);
    }
  }

  for (const route of SEO_AUDIT_SUPPLEMENTAL_ROUTES) {
    pathsSet.add(route);
  }

  if (!options.customerFlowEnabled) {
    for (const route of Array.from(pathsSet)) {
      if (isB2cRoute(route)) {
        pathsSet.delete(route);
      }
    }
  }

  return Array.from(pathsSet).sort();
}
