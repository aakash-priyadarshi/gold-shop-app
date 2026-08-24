import {
  formatLiveWorkshopAccess,
  formatSellerWorkshopReply,
  formatWorkshopMetalOperationReply,
  formatWorkshopOperationalReply,
  formatWorkshopPlanCatalog,
  isWorkshopAccessQuestion,
  isWorkshopMetalOperationQuestion,
  isWorkshopOperationalQuestion,
  selectPlansWithFeature,
} from "./workshop-chat-context";

describe("workshop chat context", () => {
  it("groups live plans by country from the current catalog", () => {
    expect(
      formatWorkshopPlanCatalog({
        status: "ok",
        plans: [
          { displayName: "Pro+", country: "IN" },
          { displayName: "Enterprise", country: "IN" },
          { displayName: "Enterprise", country: "NP" },
        ],
      }),
    ).toBe("IN: Pro+, Enterprise; NP: Enterprise");
  });

  it("does not invent plans when the live catalog is empty", () => {
    expect(
      formatWorkshopPlanCatalog({ status: "ok", plans: [] }),
    ).toContain(
      "None of the currently active subscription plans include workshopManufacturing",
    );
  });

  it("states catalog is unavailable when lookup failed", () => {
    const text = formatWorkshopPlanCatalog({ status: "unavailable" });
    expect(text).toContain("temporarily unavailable");
    expect(text).not.toContain(
      "None of the currently active subscription plans include workshopManufacturing",
    );
  });

  it("tells a shop on a live included plan to open Settings → Preferences", () => {
    const access = {
      planName: "Pro+ (India)",
      country: "IN",
      workshopMode: false,
      workshopManufacturingEnabled: true,
      workshopPlanNames: ["Pro+ (India)", "Enterprise (India)"],
    };
    const reply = formatSellerWorkshopReply(access);
    expect(reply).toContain("Pro+ (India)");
    expect(reply).toContain("Workshop mode is off");
    expect(reply).toContain("Settings → Preferences");
    expect(reply).toContain("Enterprise (India)");
    expect(formatLiveWorkshopAccess(access)).toContain(
      "workshopManufacturing on this plan: included",
    );
  });

  it("requires an explicit workshopManufacturing true in live plan JSON", () => {
    expect(
      selectPlansWithFeature(
        [
          {
            displayName: "Enterprise (India)",
            name: "ENTERPRISE",
            country: "IN",
            features: { workshopManufacturing: false },
          },
          {
            displayName: "Pro+ (India)",
            name: "PRO_PLUS",
            country: "IN",
            features: { crm: true },
          },
          {
            displayName: "Pro+ (UAE)",
            name: "PRO_PLUS",
            country: "AE",
            features: { workshopManufacturing: true },
          },
        ],
        "workshopManufacturing",
      ).map((plan) => plan.displayName),
    ).toEqual(["Pro+ (UAE)"]);
  });

  it("uses this shop's live plan even when the catalog also lists others", () => {
    const reply = formatSellerWorkshopReply({
      planName: "Free Plan",
      country: "IN",
      workshopMode: false,
      workshopManufacturingEnabled: false,
      workshopPlanNames: ["Enterprise (India)"],
    });
    expect(reply).toContain("Free Plan");
    expect(reply).toContain("does not include workshop manufacturing");
    expect(reply).toContain("Enterprise (India)");
    expect(reply).not.toContain("typically Pro+");
  });

  it("does not claim entitlement is off when plan lookup failed", () => {
    const access = formatLiveWorkshopAccess({
      planName: "Pro+ (India)",
      country: "IN",
      workshopMode: false,
      workshopManufacturingEnabled: null,
      workshopPlanNames: [],
      workshopPlanCatalogUnavailable: true,
    });
    expect(access).toContain("temporarily unavailable");
    expect(access).not.toContain("workshopManufacturing on this plan: not included");
    expect(formatSellerWorkshopReply({
      planName: "Pro+ (India)",
      country: "IN",
      workshopMode: false,
      workshopManufacturingEnabled: null,
      workshopPlanNames: [],
      workshopPlanCatalogUnavailable: true,
    })).not.toContain("does not include workshop manufacturing");
  });

  it("routes metal operations separately from access questions", () => {
    expect(isWorkshopMetalOperationQuestion("how do I return scrap?")).toBe(
      true,
    );
    expect(isWorkshopAccessQuestion("how do I return scrap?")).toBe(false);
    expect(isWorkshopAccessQuestion("which plan includes workshop mode?")).toBe(
      true,
    );
    expect(
      formatWorkshopMetalOperationReply({
        workshopMode: true,
        workshopManufacturingEnabled: true,
      }),
    ).toContain("Metal tab");
    expect(isWorkshopMetalOperationQuestion("where is gold loss?")).toBe(true);
    expect(isWorkshopMetalOperationQuestion("open the gold-loss report")).toBe(
      true,
    );
  });

  it("explains Karigar book versus Workshop from the shop's live entitlement", () => {
    expect(
      isWorkshopAccessQuestion(
        "What is the difference between Karigar book and Workshop mode?",
      ),
    ).toBe(true);
    expect(
      formatSellerWorkshopReply({
        planName: "Workshop Plan",
        country: "IN",
        workshopMode: true,
        workshopManufacturingEnabled: true,
        workshopPlanNames: ["Workshop Plan"],
      }),
    ).toContain("normal small-artisan ledger");
  });

  it("gives the next safe workshop action without claiming fixed plan names", () => {
    const enabled = {
      workshopMode: true,
      workshopManufacturingEnabled: true,
    } as const;

    expect(isWorkshopOperationalQuestion("Why can't I receive this workshop item?")).toBe(
      true,
    );
    expect(
      formatWorkshopOperationalReply(
        enabled,
        "Why can't I receive this workshop item?",
      ),
    ).toContain("Supply Chain → QC");
    expect(
      formatWorkshopOperationalReply(enabled, "Why can't I delete this karigar job?"),
    ).toContain("Cancel / archive");
    expect(
      formatWorkshopOperationalReply(enabled, "How are wages settled?"),
    ).toContain("separate from the physical-metal return");
    expect(
      formatWorkshopOperationalReply(enabled, "How do I procure bullion?"),
    ).toContain("does not create a supplier bill");
  });
});
