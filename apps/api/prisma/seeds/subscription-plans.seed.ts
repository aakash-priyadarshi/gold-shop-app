import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed subscription plans for every market region.
 * Creates FREE, PRO, and PRO_PLUS (Pro+) tiers per country with local-currency pricing.
 * All plans are fully configurable from the Admin Billing dashboard at runtime.
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
  // Prices are calibrated to local markets; admin can adjust anytime

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
    NP: { monthly: 9999, annual: 99990, extraCredit: 30 },
    IN: { monthly: 4999, annual: 49990, extraCredit: 15 },
    AE: { monthly: 499, annual: 4990, extraCredit: 3 },
    UK: { monthly: 149, annual: 1490, extraCredit: 1 },
    US: { monthly: 199, annual: 1990, extraCredit: 1.2 },
    EU: { monthly: 149, annual: 1490, extraCredit: 1 },
  };

  // ─── FREE plans for every country ──────────────

  for (const region of REGIONS) {
    const plan = await prisma.subscriptionPlan.upsert({
      where: { name_country: { name: "FREE", country: region } },
      update: {},
      create: {
        name: "FREE",
        displayName: `Free Plan (${COUNTRY_NAMES[region]})`,
        description: `Free tier for sellers in ${COUNTRY_NAMES[region]}. Includes basic marketplace features.`,
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
          prioritySupport: false,
          customBranding: false,
          bulkUpload: false,
        },
        isActive: true,
        sortOrder: 0,
      },
    });
    console.log(`  ✅ FREE plan (${region}): ${plan.id}`);
  }

  // ─── PRO plans for every country ──────────────

  for (const region of REGIONS) {
    const p = PRO_PRICING[region];
    const plan = await prisma.subscriptionPlan.upsert({
      where: { name_country: { name: "PRO", country: region } },
      update: {},
      create: {
        name: "PRO",
        displayName: `Pro Plan (${COUNTRY_NAMES[region]})`,
        description: `For growing sellers in ${COUNTRY_NAMES[region]}. Lower commission, AI design credits, and priority listings.`,
        country: region,
        currency: CURRENCY_MAP[region] as any,
        monthlyPrice: p.monthly,
        annualPrice: p.annual,
        catalogueLimit: 200,
        commissionPercent: 3.0,
        includesAi: true,
        monthlyAiCredits: 50,
        rolloverCap: 100,
        extraCreditPrice: p.extraCredit,
        overageBehavior: "BLOCK",
        features: {
          basicAnalytics: true,
          advancedAnalytics: true,
          prioritySupport: true,
          customBranding: true,
          bulkUpload: true,
          priorityListing: true,
        },
        isActive: true,
        sortOrder: 1,
      },
    });
    console.log(`  ✅ PRO plan (${region}): ${plan.id}`);
  }

  // ─── PRO+ plans for every country ──────────────

  for (const region of REGIONS) {
    const e = PRO_PLUS_PRICING[region];
    const plan = await prisma.subscriptionPlan.upsert({
      where: { name_country: { name: "PRO_PLUS", country: region } },
      update: {},
      create: {
        name: "PRO_PLUS",
        displayName: `Pro+ (${COUNTRY_NAMES[region]})`,
        description: `Unlimited catalogue, lowest commission, generous AI credits, dedicated support, API access, and white-label options.`,
        country: region,
        currency: CURRENCY_MAP[region] as any,
        monthlyPrice: e.monthly,
        annualPrice: e.annual,
        catalogueLimit: null, // unlimited
        commissionPercent: 1.5,
        includesAi: true,
        monthlyAiCredits: 500,
        rolloverCap: 500,
        extraCreditPrice: e.extraCredit,
        overageBehavior: "AUTO_CHARGE",
        features: {
          basicAnalytics: true,
          advancedAnalytics: true,
          prioritySupport: true,
          dedicatedSupport: true,
          customBranding: true,
          bulkUpload: true,
          priorityListing: true,
          apiAccess: true,
          whiteLabel: true,
          multiBranch: true,
          staffAccounts: true,
          webhookSubscriptions: true,
          scheduledReports: true,
          demandForecasting: true,
          automatedRepricing: true,
          bulkImportExport: true,
          customDomain: true,
          auditLogExport: true,
          ssoIntegration: false, // coming soon
          dataResidency: false, // coming soon
        },
        isActive: true,
        sortOrder: 2,
      },
    });
    console.log(`  ✅ PRO_PLUS plan (${region}): ${plan.id}`);
  }

  console.log(
    "\n✨ Subscription plans seeded successfully! (18 plans: 6 FREE + 6 PRO + 6 PRO_PLUS)",
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
