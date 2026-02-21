import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed initial FREE subscription plans for every market region.
 * Also seeds a sample PRO plan for NP and IN.
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

  // ─── PRO plans for NP and IN ──────────────────

  const proPlanNP = await prisma.subscriptionPlan.upsert({
    where: { name_country: { name: "PRO", country: "NP" } },
    update: {},
    create: {
      name: "PRO",
      displayName: "Pro Plan (Nepal)",
      description:
        "For growing sellers in Nepal. Lower commission, AI design credits, and priority listings.",
      country: "NP",
      currency: "NPR",
      monthlyPrice: 1999,
      annualPrice: 19990,
      catalogueLimit: 200,
      commissionPercent: 3.0,
      includesAi: true,
      monthlyAiCredits: 50,
      rolloverCap: 100,
      extraCreditPrice: 50,
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
  console.log(`  ✅ PRO plan (NP): ${proPlanNP.id}`);

  const proPlanIN = await prisma.subscriptionPlan.upsert({
    where: { name_country: { name: "PRO", country: "IN" } },
    update: {},
    create: {
      name: "PRO",
      displayName: "Pro Plan (India)",
      description:
        "For growing sellers in India. Lower commission, AI design credits, and priority listings.",
      country: "IN",
      currency: "INR",
      monthlyPrice: 999,
      annualPrice: 9990,
      catalogueLimit: 200,
      commissionPercent: 3.0,
      includesAi: true,
      monthlyAiCredits: 50,
      rolloverCap: 100,
      extraCreditPrice: 25,
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
  console.log(`  ✅ PRO plan (IN): ${proPlanIN.id}`);

  // ─── ENTERPRISE plan for NP (example) ─────────

  const entNP = await prisma.subscriptionPlan.upsert({
    where: { name_country: { name: "ENTERPRISE", country: "NP" } },
    update: {},
    create: {
      name: "ENTERPRISE",
      displayName: "Enterprise (Nepal)",
      description:
        "Unlimited catalogue, lowest commission, unlimited AI credits, dedicated support.",
      country: "NP",
      currency: "NPR",
      monthlyPrice: 9999,
      annualPrice: 99990,
      catalogueLimit: null, // unlimited
      commissionPercent: 1.5,
      includesAi: true,
      monthlyAiCredits: 500,
      rolloverCap: 500,
      extraCreditPrice: 30,
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
      },
      isActive: true,
      sortOrder: 2,
    },
  });
  console.log(`  ✅ ENTERPRISE plan (NP): ${entNP.id}`);

  console.log("\n✨ Subscription plans seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
