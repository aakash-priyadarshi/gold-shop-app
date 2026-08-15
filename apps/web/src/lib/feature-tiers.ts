/**
 * Feature tiering for plan gating UX.
 *
 * The app auto-grants new shops a 60-day PRO trial, but once that expires (or
 * if it ever fails to activate) a shop falls back to the FREE plan. To make
 * sure people can always *try* the core jewellery USP features instead of
 * hitting a hard pay-wall, we split features into two tiers:
 *
 *  - PREMIUM_GATED  → genuinely paid AI + enterprise capabilities. These keep a
 *                     full upgrade wall when the plan doesn't include them.
 *  - everything else → "basic" USP features (billing, CRM, inventory, repairs,
 *                     savings, karigar supply chain, gold loans, tax reports,
 *                     quotes, catalogue, WhatsApp share). These render normally
 *                     with a soft, dismissible upgrade nudge instead of a wall.
 *
 * Keep this list in sync with the backend controllers that still carry
 * `@RequireFeature(...)` (AI design + enterprise modules).
 */
export const PREMIUM_GATED_FEATURES = new Set<string>([
  // AI
  "aiDesignGeneration",
  "aiDesignVariations",
  "aiSmartRecommendations",
  "aiPriceOptimization",
  "purchasableAiCredits",
  // Enterprise
  "multiBranch",
  "staffAccounts",
  "apiAccess",
  "webhookSubscriptions",
  "customBranding",
  "whiteLabel",
  "customDomain",
  "customIntegrations",
  "auditLogExport",
  "scheduledReports",
  "demandForecasting",
  "bulkUpload",
  "dedicatedSupport",
  "dedicatedAccountManager",
  "workshopManufacturing",
]);

/**
 * Returns true when a missing feature should still let the user preview the
 * page (with a soft nudge) rather than seeing a hard upgrade wall.
 */
export function isPreviewableFeature(featureKey: string): boolean {
  return !PREMIUM_GATED_FEATURES.has(featureKey);
}
