import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeatureGate } from "./FeatureGate";

vi.mock("@/hooks/useFeatures", () => ({
  useFeatures: () => ({
    eligiblePlans: () => [
      { name: "PRO_PLUS", displayName: "Pro+ (India)" },
      { name: "ENTERPRISE", displayName: "Enterprise (India)" },
    ],
    hasUpgradeCatalog: true,
  }),
}));
vi.mock("@/providers/translation-provider", () => ({
  useT: () => (value: string) => value,
}));

describe("FeatureGate", () => {
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
  });
});
