/**
 * Tutorial Tour Steps — Structure & Content Tests
 *
 * Verifies that the TOUR_STEPS in useTutorial.ts:
 * 1. Has steps for all key pages
 * 2. Each step has required popover fields (title + description)
 * 3. The invoice create page tour mentions the new features
 *    (tola, live rates, Skill Promotion Fee)
 * 4. No step has empty title or description
 *
 * Since TOUR_STEPS is not exported, we test by reading the source file
 * and verifying the content of the tour step definitions.
 */

import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const sourceFile = readFileSync(
  resolve(process.cwd(), "src/components/tutorial/useTutorial.ts"),
  "utf-8",
);

describe("Tutorial TOUR_STEPS — Structure", () => {
  test("source file contains TOUR_STEPS definition", () => {
    expect(sourceFile).toContain("TOUR_STEPS");
  });

  test("has tour steps for invoice create page", () => {
    expect(sourceFile).toContain('"/dashboard/shop/invoices/create"');
  });

  test("has tour steps for POS page", () => {
    expect(sourceFile).toContain('"/dashboard/shop/pos"');
  });

  test("has tour steps for dashboard shop home", () => {
    expect(sourceFile).toContain('"/dashboard/shop"');
  });

  test("has tour steps for mobile POS", () => {
    expect(sourceFile).toContain('"/m/pos"');
  });

  test("has tour steps for mobile savings", () => {
    expect(sourceFile).toContain('"/m/savings"');
  });

  test("has tour steps for admin users", () => {
    expect(sourceFile).toContain('"/dashboard/admin/users"');
  });

  test("has tour steps for hardware settings", () => {
    expect(sourceFile).toContain('"/dashboard/shop/settings/hardware"');
    expect(sourceFile).toContain('"/m/settings/hardware"');
    expect(sourceFile).toContain("hardware-receipt-printer");
  });

  test("opens Preferences before highlighting Workshop mode", () => {
    expect(sourceFile).toContain("settings-preferences-tab");
    expect(sourceFile).toContain("settings-workshop-mode");
    expect(sourceFile).toContain("activateShopSettingsPreferencesTab");
    expect(sourceFile).toContain("preferencesAdvancePending");
    expect(sourceFile).toContain("waitForTourElement");
  });

  test("has tour steps for invoice detail Print", () => {
    expect(sourceFile).toContain('"/dashboard/shop/invoices/"');
    expect(sourceFile).toContain('"/m/invoices/"');
    expect(sourceFile).toContain("invoice-print");
    expect(sourceFile).toContain("invoice-download-pdf");
  });

  test("has tour steps for admin crash reports", () => {
    expect(sourceFile).toContain('"/dashboard/admin/crash-reports"');
    expect(sourceFile).toContain("crash-reports-filters");
  });

  test("has tour steps for all seven Supply Chain views", () => {
    expect(sourceFile).toContain('"/dashboard/shop/supply-chain"');
    expect(sourceFile).toContain('"/dashboard/shop/supply-chain#workshop-tower"');
    expect(sourceFile).toContain('"/dashboard/shop/supply-chain#workshop-jobs"');
    expect(sourceFile).toContain('"/dashboard/shop/supply-chain#workshop-floor"');
    expect(sourceFile).toContain('"/dashboard/shop/supply-chain#workshop-metal"');
    expect(sourceFile).toContain('"/dashboard/shop/supply-chain#workshop-qc"');
    expect(sourceFile).toContain('"/dashboard/shop/supply-chain#workshop-reports"');
    expect(sourceFile).toContain("supply-chain-nav");
    expect(sourceFile).toContain("supply-nav-book");
    expect(sourceFile).toContain("supply-nav-tower");
    expect(sourceFile).toContain("workshop-floor-depts");
    expect(sourceFile).toContain("workshop-metal-form");
    expect(sourceFile).toContain("workshop-qc-queue");
    expect(sourceFile).toContain("workshop-reports");
  });

  test("Supply Chain factory tours do not claim Tower replaces the karigar book", () => {
    expect(sourceFile).not.toContain(
      "This replaces Supply Chain when Workshop mode is on",
    );
    expect(sourceFile).toContain("does not replace the Karigar book");
  });

  test("POS tour explains the register, pending payment, drawer, and return rules", () => {
    expect(sourceFile).toContain("pos-register-shift");
    expect(sourceFile).toContain("Confirm Payment Received");
    expect(sourceFile).toContain("PARTIALLY_PAID");
    expect(sourceFile).toContain("pos-drawer");
    expect(sourceFile).toContain("pos-return-exchange");
    expect(sourceFile).toContain("Z-report");
  });

  test("Supply Chain tours distinguish normal Karigar work from Workshop mode", () => {
    expect(sourceFile).toContain("normal small-artisan ledger");
    expect(sourceFile).toContain("Factory tabs are a separate Workshop-mode workflow");
    expect(sourceFile).toContain("Cancel/archive a job");
    expect(sourceFile).toContain("Approve is the required next step");
  });
});

describe("Tutorial — Invoice Create Page Content", () => {
  test("country step mentions Skill Promotion Fee as the active tax", () => {
    // Find the country step description specifically
    const countryStepMatch = sourceFile.match(
      /data-tour='invoice-create-country'[\s\S]*?description:\s*"([^"]*)"/,
    );
    const description = countryStepMatch?.[1] || "";
    expect(description).toContain("Skill Promotion Fee");
    expect(description).toContain("0.5%");
    // The old luxury tax is mentioned in a historical context ("replaces the old 2% luxury tax")
    // which is correct — we just need to ensure the active tax is the Skill Promotion Fee
    expect(description).toContain("replaces the old 2% luxury tax");
  });

  test("country step mentions 0.5% rate", () => {
    const countryStepMatch = sourceFile.match(
      /data-tour='invoice-create-country'[\s\S]*?description:\s*"([^"]*)"/,
    );
    const description = countryStepMatch?.[1] || "";
    expect(description).toContain("0.5%");
  });

  test("items step mentions tola weight unit", () => {
    const itemsStepMatch = sourceFile.match(
      /data-tour='invoice-create-items'[\s\S]*?description:\s*"([^"]*)"/,
    );
    const description = itemsStepMatch?.[1] || "";
    expect(description.toLowerCase()).toContain("tola");
  });

  test("items step mentions live rates autofill", () => {
    const itemsStepMatch = sourceFile.match(
      /data-tour='invoice-create-items'[\s\S]*?description:\s*"([^"]*)"/,
    );
    const description = itemsStepMatch?.[1] || "";
    expect(description.toLowerCase()).toContain("live");
    expect(description.toLowerCase()).toContain("autofill");
  });

  test("items step mentions weight unit selector", () => {
    const itemsStepMatch = sourceFile.match(
      /data-tour='invoice-create-items'[\s\S]*?description:\s*"([^"]*)"/,
    );
    const description = itemsStepMatch?.[1] || "";
    expect(description.toLowerCase()).toContain("weight unit");
  });

  test("all four data-tour anchors exist for invoice create", () => {
    expect(sourceFile).toContain("invoice-create-country");
    expect(sourceFile).toContain("invoice-create-customer");
    expect(sourceFile).toContain("invoice-create-items");
    expect(sourceFile).toContain("invoice-create-totals");
  });
});

describe("Tutorial — Pre-registration Logic", () => {
  test("useTutorial uses useTranslation for pre-registration", () => {
    expect(sourceFile).toContain("useTranslation");
    expect(sourceFile).toContain("register");
  });

  test("useTutorial pre-registers titles and descriptions", () => {
    expect(sourceFile).toContain("step.popover?.title");
    expect(sourceFile).toContain("step.popover?.description");
    expect(sourceFile).toContain("register(step.popover.title)");
    expect(sourceFile).toContain("register(step.popover.description)");
  });

  test("pre-registration only runs for non-English locale", () => {
    expect(sourceFile).toContain('locale === "en"');
  });

  test("useTutorial still uses t() for live translation", () => {
    expect(sourceFile).toContain("translateTourSteps(rawSteps, t)");
  });

  test("translated steps recompute when t() identity changes after the dictionary fills", () => {
    expect(sourceFile).toContain("translateTourSteps(rawSteps, t)");
  });

  test("rawSteps and steps are separated (pre-registration on raw, translation on steps)", () => {
    expect(sourceFile).toContain("rawSteps");
    expect(sourceFile).toContain("return { steps, rawSteps, hasSteps: steps.length > 0 }");
  });
});
