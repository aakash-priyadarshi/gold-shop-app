#!/usr/bin/env tsx
/**
 * Delete a specific design by ID directly via Prisma
 * Usage: npx tsx scripts/delete-design.ts <designId>
 *
 * Requires DATABASE_URL in apps/api/.env
 */

import { PrismaClient } from "../apps/api/node_modules/@prisma/client/index.js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../apps/api/.env") });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  const designId = process.argv[2];

  if (!designId) {
    // List all designs so the caller can pick the right one
    const designs = await prisma.design.findMany({
      select: {
        id: true,
        jewelryType: true,
        creatorName: true,
        imageUrl: true,
        createdAt: true,
        isApproved: true,
      },
      orderBy: { createdAt: "asc" },
    });

    console.log("\nAll designs in DB:\n");
    designs.forEach((d, i) => {
      console.log(`[${i + 1}] ID:          ${d.id}`);
      console.log(`    Type:        ${d.jewelryType}`);
      console.log(`    Creator:     ${d.creatorName ?? "(none)"}`);
      console.log(`    Image:       ${d.imageUrl}`);
      console.log(`    Created:     ${d.createdAt.toISOString()}`);
      console.log(`    Approved:    ${d.isApproved}`);
      console.log();
    });

    console.log(`Re-run with the ID to delete:  npx tsx scripts/delete-design.ts <id>\n`);
    return;
  }

  const design = await prisma.design.findUnique({ where: { id: designId } });

  if (!design) {
    console.error(`\nNo design found with ID: ${designId}`);
    process.exit(1);
  }

  console.log(`\nAbout to delete:`);
  console.log(`  ID:      ${design.id}`);
  console.log(`  Type:    ${design.jewelryType}`);
  console.log(`  Creator: ${design.creatorName}`);
  console.log(`  Image:   ${design.imageUrl}`);
  console.log();

  // Delete likes first (foreign key), then the design
  const likesDeleted = await prisma.designLike.deleteMany({
    where: { designId },
  });
  await prisma.design.delete({ where: { id: designId } });

  console.log(
    `✓ Deleted design ${designId} (${likesDeleted.count} likes also removed).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
