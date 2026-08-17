import {
  formatLiveWorkshopAccess,
  formatSellerWorkshopReply,
  formatWorkshopPlanCatalog,
  selectPlansWithFeature,
} from "./workshop-chat-context";

describe("workshop chat context", () => {
  it("groups live plans by country from the current catalog", () => {
    expect(
      formatWorkshopPlanCatalog([
        { displayName: "Pro+", country: "IN" },
        { displayName: "Enterprise", country: "IN" },
        { displayName: "Enterprise", country: "NP" },
      ]),
    ).toBe("IN: Pro+, Enterprise; NP: Enterprise");
  });

  it("does not invent plans when the live catalog is empty", () => {
    expect(formatWorkshopPlanCatalog([])).toContain(
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
});
