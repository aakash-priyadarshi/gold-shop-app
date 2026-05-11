/**
 * Seed Desktop Releases
 *
 * Restores the Orivraa Desktop app entry so it appears on the /download page.
 *
 * Run from apps/api/:
 *   npx ts-node prisma/seeds/releases.seed.ts
 *
 * Safe to run multiple times — uses upsert on (version, platform).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🖥  Seeding Desktop Releases...\n");

  // ── Windows v0.1.0 ──────────────────────────────────────────────────────────
  const windows = await prisma.appRelease.upsert({
    where: { version_platform: { version: "0.1.0", platform: "WINDOWS" } },
    update: {
      isLatest: true,
      isActive: true,
      downloadUrl:
        "https://releases.orivraa.com/desktop/v0.1.0/Orivraa_0.1.0_x64-setup.exe",
    },
    create: {
      version: "0.1.0",
      platform: "WINDOWS",
      channel: "stable",
      downloadUrl:
        "https://releases.orivraa.com/desktop/v0.1.0/Orivraa_0.1.0_x64-setup.exe",
      fileName: "Orivraa_0.1.0_x64-setup.exe",
      changelog:
        "- Initial release\n- Gold & jewellery inventory management\n- Real-time metal pricing\n- Offline-capable with sync",
      changelogSource: "manual",
      isLatest: true,
      isActive: true,
      minOs: "Windows 10 (1809+)",
      minRam: "4 GB",
      minDisk: "200 MB",
      architecture: "x64",
    },
  });

  console.log(`  ✅ WINDOWS  v${windows.version}  (id: ${windows.id})`);
  console.log(`     URL: ${windows.downloadUrl}`);
  console.log("");
  console.log("Done! The desktop app will now appear on /download.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
