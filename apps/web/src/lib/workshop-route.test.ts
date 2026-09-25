import { describe, expect, it } from "vitest";
import {
  legacyWorkshopDestination,
  parseWorkshopView,
  supplyChainHref,
} from "./workshop-route";

describe("workshop route consolidation", () => {
  it("keeps every workshop view under Supply Chain and canonicalizes aliases", () => {
    expect(supplyChainHref("overview")).toBe(
      "/dashboard/shop/supply-chain?view=overview",
    );
    expect(supplyChainHref("tower")).toBe(
      "/dashboard/shop/supply-chain?view=overview",
    );
    expect(supplyChainHref("floor")).toBe(
      "/dashboard/shop/supply-chain?view=production",
    );
    expect(supplyChainHref("job", { id: "job-1" })).toBe(
      "/dashboard/shop/supply-chain?view=job&id=job-1",
    );
  });

  it("maps legacy factory routes to equivalent Supply Chain views", () => {
    expect(
      legacyWorkshopDestination("/dashboard/shop/workshop/jobs/job-1"),
    ).toBe("/dashboard/shop/supply-chain?view=job&id=job-1");
    expect(
      legacyWorkshopDestination(
        "/dashboard/shop/workshop/floor",
        "dept=QC",
      ),
    ).toBe("/dashboard/shop/supply-chain?view=production&dept=QC");
    expect(
      legacyWorkshopDestination("/dashboard/shop/workshop/ledger"),
    ).toBe("/dashboard/shop/supply-chain?view=metal");
    expect(
      legacyWorkshopDestination("/dashboard/shop/workshop/karigars"),
    ).toBe("/dashboard/shop/supply-chain?view=book");
  });

  it("falls back unknown views and legacy paths to the overview", () => {
    expect(parseWorkshopView("unknown")).toBe("overview");
    expect(parseWorkshopView(null)).toBe("overview");
    expect(
      legacyWorkshopDestination("/dashboard/shop/workshop/unknown"),
    ).toBe("/dashboard/shop/supply-chain?view=overview");
  });
});
