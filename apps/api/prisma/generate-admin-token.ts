/**
 * Generate a long-lived admin JWT for CI/CD (ORIVRAA_ADMIN_TOKEN).
 * Usage: npx tsx prisma/generate-admin-token.ts
 */
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

async function main() {
  // Find the JWT secret
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("ERROR: JWT_SECRET env var not set");
    process.exit(1);
  }

  // Find admin users
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: { not: "DEACTIVATED" } },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
  });

  if (admins.length === 0) {
    console.error("No active admin users found in the database");
    process.exit(1);
  }

  console.log("Admin users found:");
  for (const a of admins) {
    console.log(`  ${a.id} | ${a.email} | ${a.firstName} ${a.lastName} | ${a.status}`);
  }

  // Generate a 10-year token for the first admin
  const admin = admins[0];
  const payload = {
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    shopId: null,
  };

  const token = jwt.sign(payload, secret, { expiresIn: "10y" });
  console.log("\n=== ORIVRAA_ADMIN_TOKEN (10-year expiry) ===");
  console.log('Token generated: ' + token.substring(0, 12) + '...');
  console.log("\nAdd this as a GitHub Actions secret named ORIVRAA_ADMIN_TOKEN:");
  console.log("  https://github.com/aakash-priyadarshi/gold-shop-app/settings/secrets/actions");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
