/**
 * Seed Payment Gateway Configurations
 *
 * Run:  npx ts-node prisma/seeds/gateway-configs.seed.ts
 *
 * Creates gateway configs for all supported gateways:
 *   - Stripe  (US, UK, EU, AE)  — default fallback
 *   - PhonePe (IN)              — primary for India
 *   - eSewa   (NP)              — primary for Nepal
 *   - Khalti  (NP)              — secondary for Nepal
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GATEWAY_CONFIGS = [
  {
    gatewayName: "stripe",
    displayName: "Stripe",
    isEnabled: true,
    isDefault: true, // fallback gateway for uncovered countries
    supportedCountries: ["US", "UK", "EU", "AE"],
    supportedMethods: ["CARD", "BANK_TRANSFER", "PAYPAL"],
    priority: 10,
    envKeyLabel: "STRIPE_SECRET_KEY",
    envKeysRequired: [
      "STRIPE_SECRET_KEY",
      "STRIPE_PUBLISHABLE_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ],
    commissionInfo: "2.9% + 30¢ (domestic) | 3.9% + 30¢ (international)",
    webhookEndpoint: "/payment-gateway/webhooks/stripe",
  },
  {
    gatewayName: "phonepe",
    displayName: "PhonePe",
    isEnabled: true,
    isDefault: false,
    supportedCountries: ["IN"],
    supportedMethods: ["UPI", "CARD", "PHONEPE"],
    priority: 10,
    envKeyLabel: "PHONEPE_MERCHANT_ID",
    envKeysRequired: [
      "PHONEPE_MERCHANT_ID",
      "PHONEPE_SALT_KEY",
      "PHONEPE_SALT_INDEX",
      "PHONEPE_ENV",
    ],
    commissionInfo: "~1.5% per UPI txn | ~1.75% for cards",
    webhookEndpoint: "/payment-gateway/webhooks/phonepe",
  },
  {
    gatewayName: "esewa",
    displayName: "eSewa",
    isEnabled: true,
    isDefault: false,
    supportedCountries: ["NP"],
    supportedMethods: ["ESEWA"],
    priority: 10,
    envKeyLabel: "ESEWA_MERCHANT_ID",
    envKeysRequired: ["ESEWA_MERCHANT_ID", "ESEWA_SECRET"],
    commissionInfo: "~1.5-2% per txn",
    webhookEndpoint: null,
  },
  {
    gatewayName: "khalti",
    displayName: "Khalti",
    isEnabled: true,
    isDefault: false,
    supportedCountries: ["NP"],
    supportedMethods: ["KHALTI"],
    priority: 5,
    envKeyLabel: "KHALTI_SECRET_KEY",
    envKeysRequired: ["KHALTI_SECRET_KEY"],
    commissionInfo: "~1.5-2% per txn",
    webhookEndpoint: null,
  },
  {
    gatewayName: "razorpay",
    displayName: "Razorpay",
    isEnabled: false, // disabled by default — PhonePe is primary for IN
    isDefault: false,
    supportedCountries: ["IN"],
    supportedMethods: ["CARD", "UPI", "BANK_TRANSFER"],
    priority: 5,
    envKeyLabel: "RAZORPAY_KEY_ID",
    envKeysRequired: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
    commissionInfo: "~2% per txn",
    webhookEndpoint: null,
  },
];

async function main() {
  console.log("🔌 Seeding Gateway Configurations...\n");

  for (const gw of GATEWAY_CONFIGS) {
    const existing = await prisma.paymentGatewayConfig.findFirst({
      where: { gatewayName: gw.gatewayName },
    });

    if (existing) {
      await prisma.paymentGatewayConfig.update({
        where: { id: existing.id },
        data: {
          displayName: gw.displayName,
          isEnabled: gw.isEnabled,
          isDefault: gw.isDefault,
          supportedCountries: gw.supportedCountries as any,
          supportedMethods: gw.supportedMethods as any,
          priority: gw.priority,
          envKeyLabel: gw.envKeyLabel,
          envKeysRequired: gw.envKeysRequired,
          commissionInfo: gw.commissionInfo,
          webhookEndpoint: gw.webhookEndpoint,
          updatedBy: "system-seed",
        },
      });
      console.log(`  ✅ Updated: ${gw.displayName} (${gw.supportedCountries.join(", ")})`);
    } else {
      await prisma.paymentGatewayConfig.create({
        data: {
          gatewayName: gw.gatewayName,
          displayName: gw.displayName,
          isEnabled: gw.isEnabled,
          isDefault: gw.isDefault,
          supportedCountries: gw.supportedCountries as any,
          supportedMethods: gw.supportedMethods as any,
          priority: gw.priority,
          envKeyLabel: gw.envKeyLabel,
          envKeysRequired: gw.envKeysRequired,
          commissionInfo: gw.commissionInfo,
          webhookEndpoint: gw.webhookEndpoint,
          updatedBy: "system-seed",
        },
      });
      console.log(`  ✨ Created: ${gw.displayName} (${gw.supportedCountries.join(", ")})`);
    }
  }

  const total = await prisma.paymentGatewayConfig.count();
  console.log(`\n✅ Done! ${total} gateway configs in database.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
