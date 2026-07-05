/**
 * Publish v0.2.0 releases for Windows and macOS directly to the database.
 * The CI workflow's API publish step failed silently (missing ORIVRAA_ADMIN_TOKEN).
 * This script inserts the releases using the GitHub Release asset URLs.
 *
 * Usage: npx tsx prisma/publish-v0.2.0.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VERSION = "0.2.0";
const GITHUB_BASE =
  "https://github.com/aakash-priyadarshi/gold-shop-app/releases/download/desktop-v0.2.0";

const CHANGELOG = `- feat: auto-update with R2 primary + GitHub fallback
- feat: security audit fixes (CSP hardening, log redaction, URL validation, token expiry)
- feat: redesigned download page with framer-motion animations
- feat: macOS universal binary support
- fix: tax DB update, currency-aware live rates, shop-country weight units`;

interface ReleaseInput {
  platform: "WINDOWS" | "MACOS";
  downloadUrl: string;
  fileSize: number;
  fileName: string;
  minOs: string;
  architecture: string;
}

const releases: ReleaseInput[] = [
  {
    platform: "WINDOWS",
    downloadUrl: `${GITHUB_BASE}/Orivraa_0.2.0_x64-setup.exe`,
    fileSize: 4968488,
    fileName: "Orivraa_0.2.0_x64-setup.exe",
    minOs: "Windows 10 (1809+)",
    architecture: "x64",
  },
  {
    platform: "MACOS",
    downloadUrl: `${GITHUB_BASE}/Orivraa_0.2.0_universal.dmg`,
    fileSize: 16307244,
    fileName: "Orivraa_0.2.0_universal.dmg",
    minOs: "macOS 12+",
    architecture: "universal",
  },
];

async function main() {
  for (const r of releases) {
    // Check if already exists
    const existing = await prisma.appRelease.findFirst({
      where: { version: VERSION, platform: r.platform },
    });
    if (existing) {
      console.log(
        `${r.platform} v${VERSION} already exists (id: ${existing.id}), updating...`,
      );
      // Unset current latest for this platform
      await prisma.appRelease.updateMany({
        where: { platform: r.platform, isLatest: true, id: { not: existing.id } },
        data: { isLatest: false },
      });
      // Update existing record
      await prisma.appRelease.update({
        where: { id: existing.id },
        data: {
          downloadUrl: r.downloadUrl,
          fileSize: BigInt(r.fileSize),
          fileName: r.fileName,
          changelog: CHANGELOG,
          changelogSource: "github",
          isLatest: true,
          isActive: true,
          minOs: r.minOs,
          architecture: r.architecture,
          minRam: "4 GB",
          minDisk: "200 MB",
        },
      });
      console.log(`  Updated ${r.platform} v${VERSION} as latest`);
    } else {
      // Unset current latest for this platform
      await prisma.appRelease.updateMany({
        where: { platform: r.platform, isLatest: true },
        data: { isLatest: false },
      });
      // Create new release
      const created = await prisma.appRelease.create({
        data: {
          version: VERSION,
          platform: r.platform,
          channel: "stable",
          downloadUrl: r.downloadUrl,
          fileSize: BigInt(r.fileSize),
          fileName: r.fileName,
          changelog: CHANGELOG,
          changelogSource: "github",
          isLatest: true,
          isActive: true,
          minOs: r.minOs,
          architecture: r.architecture,
          minRam: "4 GB",
          minDisk: "200 MB",
        },
      });
      console.log(`  Created ${r.platform} v${VERSION} (id: ${created.id})`);
    }

    // Keep latest 6 active, deactivate the rest
    const allForPlatform = await prisma.appRelease.findMany({
      where: { platform: r.platform, isActive: true },
      orderBy: { publishedAt: "desc" },
    });
    if (allForPlatform.length > 6) {
      const toDeactivate = allForPlatform.slice(6).map((r) => r.id);
      await prisma.appRelease.updateMany({
        where: { id: { in: toDeactivate } },
        data: { isActive: false },
      });
      console.log(`  Deactivated ${toDeactivate.length} old releases`);
    }
  }

  // Verify
  const all = await prisma.appRelease.findMany({
    where: { isLatest: true, isActive: true },
  });
  console.log("\nLatest active releases:");
  for (const r of all) {
    console.log(
      `  ${r.platform} v${r.version} | ${r.fileName} | ${r.downloadUrl}`,
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
