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
import { upsertDefaultGatewayConfigs } from "../../src/modules/payment-gateway/default-gateway-configs";

const prisma = new PrismaClient();

async function main() {
  console.log("🔌 Seeding Gateway Configurations...\n");
  const total = await upsertDefaultGatewayConfigs(prisma);
  console.log(`\n✅ Done! ${total} gateway configs in database.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
