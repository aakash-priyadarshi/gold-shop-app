/**
 * Insert the ORIVRAA_ADMIN_TOKEN (JWT) into the ApiToken table
 * so it shows up in the existing "Active Tokens" list on the admin dashboard.
 *
 * This is for tracking/visibility only — the token is a JWT validated by
 * JwtAuthGuard, not a gshop_ token validated by ApiTokenService.
 */
import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";

const prisma = new PrismaClient();

const ADMIN_USER_ID = "bdca41d5-723f-4401-9b4f-04bb93ded2ec";
const JWT_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiZGNhNDFkNS03MjNmLTQ0MDEtOWI0Zi0wNGJiOTNkZWQyZWMiLCJlbWFpbCI6ImFkbWluQG9yaXZyYWEuY29tIiwicm9sZSI6IkFETUlOIiwic2hvcElkIjpudWxsLCJpYXQiOjE3ODMyNzI0NTAsImV4cCI6MjA5ODg0ODQ1MH0.6CmYlLRw-WPVVGy6o4Tcg2ogBQt7UTxUkpi5GnwblOU";

async function main() {
  const tokenHash = crypto.createHash("sha256").update(JWT_TOKEN).digest("hex");
  const tokenPrefix = JWT_TOKEN.substring(0, 12);

  // 10-year expiry (matches the JWT's exp claim: July 2036)
  const expiresAt = new Date("2036-07-05T17:27:30Z");

  // Check if already exists
  const existing = await prisma.apiToken.findUnique({
    where: { tokenHash },
  });

  if (existing) {
    console.log(`Token already exists (id: ${existing.id}), updating...`);
    await prisma.apiToken.update({
      where: { id: existing.id },
      data: {
        name: "ORIVRAA_ADMIN_TOKEN (CI/CD)",
        scopes: ["admin:read", "admin:write"],
        expiresAt,
        revokedAt: null,
      },
    });
    console.log("Updated.");
  } else {
    await prisma.apiToken.create({
      data: {
        userId: ADMIN_USER_ID,
        name: "ORIVRAA_ADMIN_TOKEN (CI/CD)",
        tokenHash,
        tokenPrefix,
        scopes: ["admin:read", "admin:write"],
        expiresAt,
        // No encryptedToken — this is a JWT, not viewable through the gshop_ token viewer
        encryptedToken: null,
        tokenViewableUntil: null,
      },
    });
    console.log("Created ApiToken record for ORIVRAA_ADMIN_TOKEN");
  }

  // Verify
  const tokens = await prisma.apiToken.findMany({
    where: { userId: ADMIN_USER_ID, revokedAt: null },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      scopes: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  console.log("\nAll active API tokens:");
  for (const t of tokens) {
    console.log(
      `  ${t.name} | ${t.tokenPrefix}... | scopes=${t.scopes.join(",")} | expires=${t.expiresAt.toISOString()}`,
    );
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
