/**
 * Update v0.2.0 release URLs to point to R2 (primary) instead of GitHub.
 * R2 serves the latest version; GitHub is the fallback for older versions.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const R2_BASE = "https://releases.orivraa.com/desktop/latest";

async function main() {
  const updates = [
    {
      platform: "WINDOWS" as const,
      downloadUrl: `${R2_BASE}/Orivraa_0.2.0_x64-setup.exe`,
    },
    {
      platform: "MACOS" as const,
      downloadUrl: `${R2_BASE}/Orivraa_0.2.0_universal.dmg`,
    },
  ];

  for (const u of updates) {
    const result = await prisma.appRelease.updateMany({
      where: { version: "0.2.0", platform: u.platform, isLatest: true },
      data: { downloadUrl: u.downloadUrl },
    });
    console.log(`Updated ${u.platform} downloadUrl → ${u.downloadUrl} (${result.count} rows)`);
  }

  // Verify
  const latest = await prisma.appRelease.findMany({
    where: { isLatest: true, isActive: true },
  });
  console.log("\nLatest releases:");
  for (const r of latest) {
    console.log(`  ${r.platform} v${r.version} → ${r.downloadUrl}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
