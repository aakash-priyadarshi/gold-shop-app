import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed subscription plans for every market region.
 * Creates 4 tiers per country: FREE, PRO, PRO_PLUS, ENTERPRISE
 * All plans are fully configurable from the Admin Billing dashboard at runtime.
 *
 * Tier Philosophy:
 * - FREE:       Basic marketplace listing, no CRM, no AI
 * - PRO:        Full CRM features, NO AI included — but AI credits are purchasable
 * - PRO_PLUS:   Full CRM + AI included (100 credits/mo), more credits purchasable
 * - ENTERPRISE: Custom pricing, everything in Pro+, dedicated support, API, white-label
 *
 * Run: npx ts-node prisma/seeds/subscription-plans.seed.ts
 */
async function main() {
  console.log("🌱 Seeding subscription plans...\n");

  const CURRENCY_MAP: Record<string, string> = {
    NP: "NPR",
    IN: "INR",
    AE: "AED",
    UK: "GBP",
    US: "USD",
    EU: "EUR",
  };

  const COUNTRY_NAMES: Record<string, string> = {
    NP: "Nepal",
    IN: "India",
    AE: "UAE",
    UK: "United Kingdom",
    US: "United States",
    EU: "Europe",
  };

  const REGIONS = ["NP", "IN", "AE", "UK", "US", "EU"] as const;

  // ─── Country-specific pricing tables ───────────

  const PRO_PRICING: Record<
    string,
    { monthly: number; annual: number; extraCredit: number }
  > = {
    NP: { monthly: 1999, annual: 19990, extraCredit: 50 },
    IN: { monthly: 999, annual: 9990, extraCredit: 25 },
    AE: { monthly: 99, annual: 990, extraCredit: 5 },
    UK: { monthly: 29, annual: 290, extraCredit: 1.5 },
    US: { monthly: 35, annual: 350, extraCredit: 2 },
    EU: { monthly: 29, annual: 290, extraCredit: 1.5 },
  };

  const PRO_PLUS_PRICING: Record<
    string,
    { monthly: number; annual: number; extraCredit: number }
  > = {
    NP: { monthly: 4999, annual: 49990, extraCredit: 30 },
    IN: { monthly: 2499, annual: 24990, extraCredit: 15 },
    AE: { monthly: 249, annual: 2490, extraCredit: 3 },
    UK: { monthly: 79, annual: 790, extraCredit: 1 },
    US: { monthly: 99, annual: 990, extraCredit: 1.2 },
    EU: { monthly: 79, annual: 790, extraCredit: 1 },
  };

  // Enterprise pricing is a starting-from baseline — actual pricing is custom per client
  const ENTERPRISE_PRICING: Record<
    string,
    { monthly: number; annual: number; extraCredit: number }
  > = {
    NP: { monthly: 14999, annual: 149990, extraCredit: 20 },
    IN: { monthly: 7999, annual: 79990, extraCredit: 10 },
    AE: { monthly: 799, annual: 7990, extraCredit: 2 },
    UK: { monthly: 249, annual: 2490, extraCredit: 0.8 },
    US: { monthly: 299, annual: 2990, extraCredit: 1 },
    EU: { monthly: 249, annual: 2490, extraCredit: 0.8 },
  };

  // ─── FREE plans ───────────────────────────────

  for (const region of REGIONS) {
    const plan = await prisma.subscriptionPlan.upsert({
      where: { name_country: { name: "FREE", country: region } },
      update: {},
      create: {
        name: "FREE",
        displayName: `Free (${COUNTRY_NAMES[region]})`,
        description:
          "Get started for free. List products on the marketplace with basic features.",
        country: region,
        currency: CURRENCY_MAP[region] as any,
        monthlyPrice: 0,
        annualPrice: 0,
        catalogueLimit: 20,
        commissionPercent: 5.0,
        includesAi: false,
        monthlyAiCredits: 0,
        rolloverCap: 0,
        extraCreditPrice: 0,
        overageBehavior: "BLOCK",
        features: {
          basicAnalytics: true,
          marketplace: true,
          prioritySupport: false,
          customBranding: false,
          bulkUpload: false,
          crm: false,
          invoicing: false,
          inventoryManagement: false,
          taxReports: true,
          taxReportsDownload: false,
          taxCaShare: false,
        },
        isActive: true,
        sortOrder: 0,
        badgeText: null,
        buttonColor: null,
      },
    });
    console.log(`  ✅ FREE (${region}): ${plan.id}`);
  }

  // ─── PRO plans — CRM without AI, credits purchasable ─────

  for (const region of REGIONS) {
    const p = PRO_PRICING[region];
    const plan = await prisma.subscriptionPlan.upsert({
      where: { name_country: { name: "PRO", country: region } },
      update: {},
      create: {
        name: "PRO",
        displayName: `Pro (${COUNTRY_NAMES[region]})`,
        description:
          "Full CRM for your jewellery business — inventory, invoicing, customer management, and analytics. AI credits available for purchase.",
        country: region,
        currency: CURRENCY_MAP[region] as any,
        monthlyPrice: p.monthly,
        annualPrice: p.annual,
        catalogueLimit: 200,
        commissionPercent: 3.0,
        includesAi: false,
        monthlyAiCredits: 0,
        rolloverCap: 0,
        extraCreditPrice: p.extraCredit,
        overageBehavior: "BLOCK",
        features: {
          basicAnalytics: true,
          advancedAnalytics: true,
          marketplace: true,
          crm: true,
          invoicing: true,
          inventoryManagement: true,
          customerManagement: true,
          prioritySupport: true,
          customBranding: true,
          bulkUpload: true,
          priorityListing: true,
          purchasableAiCredits: true,
          taxReports: true,
          taxReportsDownload: true,
          taxCaShare: false,
        },
        isActive: true,
        sortOrder: 1,
        badgeText: null,
        buttonColor: null,
      },
    });
    console.log(`  ✅ PRO (${region}): ${plan.id}`);
  }

  // ─── PRO+ plans — CRM + AI (100 credits/mo included) ─────

  for (const region of REGIONS) {
    const p = PRO_PLUS_PRICING[region];
    const plan = await prisma.subscriptionPlan.upsert({
      where: { name_country: { name: "PRO_PLUS", country: region } },
      update: {},
      create: {
        name: "PRO_PLUS",
        displayName: `Pro+ (${COUNTRY_NAMES[region]})`,
        description:
          "Everything in Pro, plus AI-powered design generation, smart recommendations, and 100 AI credits per month. Additional credits purchasable.",
        country: region,
        currency: CURRENCY_MAP[region] as any,
        monthlyPrice: p.monthly,
        annualPrice: p.annual,
        catalogueLimit: 1000,
        commissionPercent: 2.0,
        includesAi: true,
        monthlyAiCredits: 100,
        rolloverCap: 200,
        extraCreditPrice: p.extraCredit,
        overageBehavior: "BLOCK",
        features: {
          basicAnalytics: true,
          advancedAnalytics: true,
          marketplace: true,
          crm: true,
          invoicing: true,
          inventoryManagement: true,
          customerManagement: true,
          prioritySupport: true,
          customBranding: true,
          bulkUpload: true,
          priorityListing: true,
          purchasableAiCredits: true,
          aiDesignGeneration: true,
          aiDesignVariations: true,
          aiSmartRecommendations: true,
          aiPriceOptimization: true,
          scheduledReports: true,
          demandForecasting: true,
          taxReports: true,
          taxReportsDownload: true,
          taxCaShare: true,
        },
        isActive: true,
        sortOrder: 2,
        badgeText: "Most Popular",
        buttonColor: "#f59e0b",
      },
    });
    console.log(`  ✅ PRO_PLUS (${region}): ${plan.id}`);
  }

  // ─── ENTERPRISE plans — Custom, everything included ───────

  for (const region of REGIONS) {
    const e = ENTERPRISE_PRICING[region];
    const plan = await prisma.subscriptionPlan.upsert({
      where: { name_country: { name: "ENTERPRISE", country: region } },
      update: {},
      create: {
        name: "ENTERPRISE",
        displayName: `Enterprise (${COUNTRY_NAMES[region]})`,
        description:
          "Custom plan for large businesses. Unlimited catalogue, lowest commission, dedicated account manager, API access, white-label, and custom integrations.",
        country: region,
        currency: CURRENCY_MAP[region] as any,
        monthlyPrice: e.monthly,
        annualPrice: e.annual,
        catalogueLimit: null, // unlimited
        commissionPercent: 1.0,
        includesAi: true,
        monthlyAiCredits: 500,
        rolloverCap: 500,
        extraCreditPrice: e.extraCredit,
        overageBehavior: "AUTO_CHARGE",
        features: {
          basicAnalytics: true,
          advancedAnalytics: true,
          marketplace: true,
          crm: true,
          invoicing: true,
          inventoryManagement: true,
          customerManagement: true,
          prioritySupport: true,
          dedicatedSupport: true,
          dedicatedAccountManager: true,
          customBranding: true,
          bulkUpload: true,
          priorityListing: true,
          purchasableAiCredits: true,
          aiDesignGeneration: true,
          aiDesignVariations: true,
          aiSmartRecommendations: true,
          aiPriceOptimization: true,
          scheduledReports: true,
          demandForecasting: true,
          automatedRepricing: true,
          bulkImportExport: true,
          apiAccess: true,
          whiteLabel: true,
          multiBranch: true,
          staffAccounts: true,
          webhookSubscriptions: true,
          customDomain: true,
          auditLogExport: true,
          customIntegrations: true,
          ssoIntegration: false, // coming soon
          dataResidency: false, // coming soon
          taxReports: true,
          taxReportsDownload: true,
          taxCaShare: true,
        },
        isActive: true,
        sortOrder: 3,
        badgeText: null,
        buttonColor: "#7c3aed",
      },
    });
    console.log(`  ✅ ENTERPRISE (${region}): ${plan.id}`);
  }

  console.log(
    "\n✨ Subscription plans seeded! (24 plans: 6 FREE + 6 PRO + 6 PRO_PLUS + 6 ENTERPRISE)",
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
