/**
 * Submodule Architecture Tests
 *
 * Verifies that the gold-shop-core private submodule is correctly integrated:
 * 1. All 14 proprietary modules exist at apps/api/src/modules/core/
 * 2. app.module.ts imports all core modules via ./modules/core/ path
 * 3. No stale imports reference the old (pre-submodule) paths
 * 4. .gitmodules is configured with the correct URL
 * 5. CI workflows include submodules: recursive + SUBMODULE_PAT token
 * 6. Railway Dockerfile clones the private submodule during build
 */

import * as fs from "fs";
import * as path from "path";

// Project root — from apps/api/src/ go up 4 levels to the monorepo root
const PROJECT_ROOT = path.resolve(__dirname, "../../../../..");
const API_SRC = path.join(PROJECT_ROOT, "apps", "api", "src");
const CORE_DIR = path.join(API_SRC, "modules", "core");
const WORKFLOWS_DIR = path.join(PROJECT_ROOT, ".github", "workflows");
const GITMODULES = path.join(PROJECT_ROOT, ".gitmodules");
const DOCKERFILE = path.join(PROJECT_ROOT, "apps", "api", "Dockerfile");
const APP_MODULE = path.join(API_SRC, "app.module.ts");

const CORE_MODULES = [
  "subscriptions",
  "payment-gateway",
  "ai-credits",
  "pricing",
  "market-rates",
  "shop-quotes",
  "pos",
  "rfq",
  "offers",
  "commission",
  "refunds",
  "seller-performance",
  "marketplace-intelligence",
  "tax-reports",
];

const SUBMODULE_URL = "https://github.com/aakash-priyadarshi/gold-shop-core.git";

describe("gold-shop-core submodule architecture", () => {
  describe("submodule directory structure", () => {
    test("core directory exists at apps/api/src/modules/core/", () => {
      expect(fs.existsSync(CORE_DIR)).toBe(true);
      expect(fs.statSync(CORE_DIR).isDirectory()).toBe(true);
    });

    test.each(CORE_MODULES)("core module '%s' exists in submodule", (mod) => {
      const modPath = path.join(CORE_DIR, mod);
      expect(fs.existsSync(modPath)).toBe(true);
      expect(fs.statSync(modPath).isDirectory()).toBe(true);
    });

    test.each(CORE_MODULES)("core module '%s' has a .module.ts file", (mod) => {
      const modDir = path.join(CORE_DIR, mod);
      const files = fs.readdirSync(modDir);
      const moduleFile = files.find((f) => f.endsWith(".module.ts"));
      expect(moduleFile).toBeDefined();
    });

    test("old module directories are removed from public repo", () => {
      // These should NOT exist at apps/api/src/modules/<mod>/ (only at core/<mod>/)
      CORE_MODULES.forEach((mod) => {
        const oldPath = path.join(API_SRC, "modules", mod);
        // The core/ directory itself will match "core" but that's the submodule
        if (mod === "core") return;
        expect(fs.existsSync(oldPath)).toBe(false);
      });
    });
  });

  describe(".gitmodules configuration", () => {
    test(".gitmodules file exists", () => {
      expect(fs.existsSync(GITMODULES)).toBe(true);
    });

    test(".gitmodules has correct submodule path", () => {
      const content = fs.readFileSync(GITMODULES, "utf-8");
      expect(content).toContain("path = apps/api/src/modules/core");
    });

    test(".gitmodules has correct submodule URL", () => {
      const content = fs.readFileSync(GITMODULES, "utf-8");
      expect(content).toContain(`url = ${SUBMODULE_URL}`);
    });
  });

  describe("app.module.ts imports", () => {
    let appModuleContent: string;

    beforeAll(() => {
      appModuleContent = fs.readFileSync(APP_MODULE, "utf-8");
    });

    test.each(CORE_MODULES)("app.module.ts imports %s from core/ path", (mod) => {
      // Check that the import path uses ./modules/core/<mod>/
      const expectedPath = `./modules/core/${mod}/`;
      expect(appModuleContent).toContain(expectedPath);
    });

    test("app.module.ts does NOT import core modules from old paths", () => {
      // No import should reference ./modules/<mod>/ directly (without core/)
      const importLines = appModuleContent
        .split("\n")
        .filter((l) => l.trim().startsWith("import"));

      CORE_MODULES.forEach((mod) => {
        const oldPath = `./modules/${mod}/`;
        const hasOldImport = importLines.some((l) => l.includes(oldPath));
        expect(hasOldImport).toBe(false);
      });
    });
  });

  describe("no stale imports in public repo", () => {
    /**
     * Recursively find all .ts files in apps/api/src/ (excluding the core/ submodule
     * itself and node_modules) and check that none reference the old module paths.
     */
    function findTsFiles(dir: string, excludeDirs: string[] = []): string[] {
      const results: string[] = [];
      if (!fs.existsSync(dir)) return results;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (excludeDirs.includes(entry.name)) continue;
          results.push(...findTsFiles(fullPath, excludeDirs));
        } else if (entry.name.endsWith(".ts")) {
          results.push(fullPath);
        }
      }
      return results;
    }

    test("no .ts file in public repo imports from old (non-core) module paths", () => {
      const tsFiles = findTsFiles(API_SRC, ["core", "node_modules", "__tests__"]);

      const violations: string[] = [];
      tsFiles.forEach((file) => {
        const content = fs.readFileSync(file, "utf-8");
        CORE_MODULES.forEach((mod) => {
          // Match: from "../subscriptions/ or from "../../subscriptions/ or from "./subscriptions/
          // but NOT from "../core/subscriptions/ or "./modules/core/subscriptions/"
          const patterns = [
            new RegExp(`from\\s+['"]\\.\\./${mod}/`),
            new RegExp(`from\\s+['"]\\.\\./\\.\\./${mod}/`),
            new RegExp(`from\\s+['"]\\./${mod}/`),
          ];
          patterns.forEach((p) => {
            if (p.test(content)) {
              violations.push(`${path.relative(API_SRC, file)} imports ${mod} without core/ prefix`);
            }
          });
        });
      });

      expect(violations).toEqual([]);
    });
  });

  describe("CI workflow configuration", () => {
    const BUILD_WORKFLOWS = [
      "pr-check.yml",
      "test.yml",
      "desktop-build.yml",
      "main-deploy-guard.yml",
    ];

    test.each(BUILD_WORKFLOWS)("%s has submodules: recursive in checkout", (workflow) => {
      const wfPath = path.join(WORKFLOWS_DIR, workflow);
      if (!fs.existsSync(wfPath)) return; // skip if workflow doesn't exist
      const content = fs.readFileSync(wfPath, "utf-8");
      expect(content).toContain("submodules: recursive");
    });

    test.each(BUILD_WORKFLOWS)("%s uses SUBMODULE_PAT token for checkout", (workflow) => {
      const wfPath = path.join(WORKFLOWS_DIR, workflow);
      if (!fs.existsSync(wfPath)) return;
      const content = fs.readFileSync(wfPath, "utf-8");
      expect(content).toContain("secrets.SUBMODULE_PAT");
    });
  });

  describe("Railway Dockerfile", () => {
    test("Dockerfile installs git (needed for submodule clone)", () => {
      const content = fs.readFileSync(DOCKERFILE, "utf-8");
      expect(content).toMatch(/apt-get\s+install.*git/);
    });

    test("Dockerfile has SUBMODULE_PAT arg", () => {
      const content = fs.readFileSync(DOCKERFILE, "utf-8");
      expect(content).toContain("ARG SUBMODULE_PAT");
    });

    test("Dockerfile clones gold-shop-core when SUBMODULE_PAT is set", () => {
      const content = fs.readFileSync(DOCKERFILE, "utf-8");
      expect(content).toContain("gold-shop-core.git");
      expect(content).toContain("${SUBMODULE_PAT}");
    });

    test("Dockerfile clone step is conditional (only if submodule not present)", () => {
      const content = fs.readFileSync(DOCKERFILE, "utf-8");
      // The clone should be guarded by a check to avoid re-cloning if already present
      expect(content).toContain("subscription-plans.module.ts");
    });
  });

  describe("submodule import path conventions", () => {
    /**
     * Verify that files WITHIN the core submodule use the correct relative
     * paths to reach app modules (../../auth/) and infra (../../../prisma/).
     */
    test("core module files use ../../ for app module imports", () => {
      // Check a known file: subscriptions/subscription-plans.controller.ts
      const file = path.join(CORE_DIR, "subscriptions", "subscription-plans.controller.ts");
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, "utf-8");
      // Should import from ../../auth/ (2 levels up from core/<mod>/ to modules/)
      expect(content).toContain("../../auth/");
    });

    test("core module files use ../../../ for infra imports (prisma)", () => {
      // Check a known file: subscriptions/subscription-plans.service.ts
      const file = path.join(CORE_DIR, "subscriptions", "subscription-plans.service.ts");
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, "utf-8");
      // Should import from ../../../prisma/ (3 levels up from core/<mod>/ to src/)
      expect(content).toContain("../../../prisma/");
    });

    test("core subdirectory files use extra ../ level for app imports", () => {
      // Check a file in pricing/controllers/ (one level deeper)
      const file = path.join(CORE_DIR, "pricing", "controllers", "tax-sync.controller.ts");
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, "utf-8");
      // From core/pricing/controllers/, app modules are 3 levels up: ../../../auth/
      expect(content).toContain("../../../auth/");
    });

    test("core subdirectory files use extra ../ level for infra imports", () => {
      // Check a file in pricing/services/ (one level deeper)
      const file = path.join(CORE_DIR, "pricing", "services", "pricing-engine.service.ts");
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, "utf-8");
      // From core/pricing/services/, prisma is 4 levels up: ../../../../prisma/
      expect(content).toContain("../../../../prisma/");
    });
  });
});
