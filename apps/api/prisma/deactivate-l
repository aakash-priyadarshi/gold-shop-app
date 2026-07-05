import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Deactivate all LUXURY_TAX rules for NP
  const result = await prisma.taxRuleConfig.updateMany({
    where: {
      marketRegion: "NP",
      taxType: "LUXURY_TAX",
    },
    data: {
      isActive: false,
    },
  });
  console.log(`Deactivated ${result.count} LUXURY_TAX rules for NP`);

  // Verify
  const active = await prisma.taxRuleConfig.findMany({
    where: { marketRegion: "NP", isActive: true },
    orderBy: { priority: "asc" },
  });
  console.log("Active NP tax rules:");
  for (const r of active) {
    console.log(`  ${r.category}: ${r.taxName} @ ${(r.rate * 100).toFixed(1)}% (id: ${r.id})`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
