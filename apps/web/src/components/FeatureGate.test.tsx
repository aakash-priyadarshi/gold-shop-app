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

vi.mock("@/hooks/useFeatures", () => ({
  useFeatures: mockUseFeatures,
}));
vi.mock("@/providers/translation-provider", () => ({
  useT: () => (value: string) => value,
}));

describe("FeatureGate", () => {
  beforeEach(() => {
    mockUseFeatures.mockClear();
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
});
