/**
 * Minimal deterministic data for the PR critical-journey environment.
 * Never run this against production.
 */
import { PrismaClient } from "@prisma/client";
import { assertDisposableTestDatabase } from "./test-seed-guard";

assertDisposableTestDatabase();
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "demo-shop@orivraa.com" },
  });
  if (!user) throw new Error("Run seed-demo.ts before seed-e2e.ts");

  const shop = await prisma.shop.findFirst({ where: { userId: user.id } });
  if (!shop) throw new Error("Demo shop was not created");

  await prisma.shop.update({
    where: { id: shop.id },
    data: { country: "IN", currency: "INR" },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { activeShopId: shop.id },
  });

  const pro = await prisma.subscriptionPlan.findFirst({
    where: { name: "PRO", country: "IN", isActive: true },
  });
  if (!pro) throw new Error("Run subscription-plans.seed.ts first");

  await prisma.sellerSubscription.deleteMany({ where: { shopId: shop.id } });
  const now = new Date();
  await prisma.sellerSubscription.create({
    data: {
      shopId: shop.id,
      planId: pro.id,
      status: "TRIALING",
      country: "IN",
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      autoRenew: false,
    },
  });

  await prisma.inventoryItem.upsert({
    where: { sku: "E2E-INR-GOLD-RING" },
    update: {
      shopId: shop.id,
      status: "AVAILABLE",
      stockQuantity: 4,
    },
    create: {
      shopId: shop.id,
      sku: "E2E-INR-GOLD-RING",
      jewelleryType: "RING",
      nameEn: "PR E2E INR Gold Ring",
      buildMethod: "METHOD_A",
      composition: { metalType: "GOLD_22K", purity: 0.916 },
      totalWeightGrams: 2,
      metalValueNpr: 12000,
      makingChargeNpr: 1200,
      gemstoneValueNpr: 0,
      taxNpr: 0,
      totalPriceNpr: 13200,
      images: [],
      videos: [],
      labels: ["e2e"],
      status: "AVAILABLE",
      stockQuantity: 4,
    },
  });

  const fxRates = [
    ["USD_INR", 83.5],
    ["USD_NPR", 133.6],
    ["USD_AED", 3.6725],
    ["USD_GBP", 0.79],
    ["USD_EUR", 0.92],
    ["USD_LKR", 300],
  ] as const;
  for (const [pair, rate] of fxRates) {
    await prisma.fxRateSnapshot.upsert({
      where: { pair },
      update: { rate, source: "e2e", updatedAt: now },
      create: { pair, rate, source: "e2e", updatedAt: now },
    });
  }
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
