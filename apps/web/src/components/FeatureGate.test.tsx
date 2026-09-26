import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeatureGate } from "./FeatureGate";

const mockUseFeatures = vi.hoisted(() =>
  vi.fn(() => ({
    eligiblePlans: () => [
      { name: "PRO_PLUS", displayName: "Pro+ (India)" },
      { name: "ENTERPRISE", displayName: "Enterprise (India)" },
    ],
    hasUpgradeCatalog: true,
  })),
);
const translation = vi.hoisted(() => ({
  locale: "en",
  t: vi.fn((value: string) => value),
  register: vi.fn(),
}));

vi.mock("@/hooks/useFeatures", () => ({
  useFeatures: mockUseFeatures,
}));
vi.mock("@/providers/translation-provider", () => ({
  useT: () => translation.t,
  useTranslation: () => translation,
}));

describe("FeatureGate", () => {
  beforeEach(() => {
    mockUseFeatures.mockClear();
    translation.locale = "en";
    translation.t.mockReset().mockImplementation((value: string) => value);
  });

  it("names only plans configured for workshop access and does not offer a Pro trial", () => {
    render(
      <FeatureGate
        feature="workshopManufacturing"
        featureLabel="Workshop manufacturing"
        hasFeature={() => false}
        planName="Free (India)"
      >
        <div>Workshop</div>
      </FeatureGate>,
    );

    expect(screen.getByText(/Available on Pro\+ \(India\), Enterprise \(India\)/)).toBeTruthy();
    expect(screen.queryByText("Activate 60-Day Premium Trial")).toBeNull();
    expect(screen.queryByText("Workshop")).toBeNull();
    expect(
      screen.getByRole("link", { name: "View Plans & Pricing" }).getAttribute("href"),
    ).toBe("/dashboard/shop/billing?tab=upgrade");
  });

  it("shares the catalog with a preview nudge without another feature request", async () => {
    render(
      <FeatureGate feature="crm" hasFeature={() => false} planName="Free (India)">
        <div>Customer CRM</div>
      </FeatureGate>,
    );

    expect(
      await screen.findByText(
        /Keep using it free. Included on Pro\+ \(India\), Enterprise \(India\)/,
      ),
    ).toBeTruthy();
    expect(mockUseFeatures).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "View plans" }).getAttribute("href")).toBe(
      "/dashboard/shop/billing?tab=upgrade",
    );
  });

  it("translates the Workshop access wall without translating configured plan names", () => {
    translation.locale = "ne";
    translation.t.mockImplementation((value: string) => `translated:${value}`);
    render(
      <FeatureGate feature="workshopManufacturing" featureLabel="Workshop manufacturing" hasFeature={() => false} planName="Free (India)">
        <div>Workshop</div>
      </FeatureGate>,
    );
    expect(screen.getByText(/translated:is not available on your plan/)).toBeTruthy();
    expect(screen.getByText(/translated:plan does not include/)).toBeTruthy();
    for (const name of ["Free (India)", "Pro+ (India)", "Enterprise (India)"]) {
      expect(translation.t).not.toHaveBeenCalledWith(name);
    }
  });
});
