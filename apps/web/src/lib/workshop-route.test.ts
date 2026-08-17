import { describe, expect, it } from "vitest";
import {
  legacyWorkshopDestination,
  parseWorkshopView,
  supplyChainHref,
} from "./workshop-route";

describe("workshop route consolidation", () => {
  it("keeps every workshop view under Supply Chain", () => {
    expect(supplyChainHref("tower")).toBe(
      "/dashboard/shop/supply-chain?view=tower",
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
    ).toBe("/dashboard/shop/supply-chain?view=floor&dept=QC");
    expect(
      legacyWorkshopDestination("/dashboard/shop/workshop/ledger"),
    ).toBe("/dashboard/shop/supply-chain?view=metal");
  });

  it("falls back unknown views and legacy paths to the tower", () => {
    expect(parseWorkshopView("unknown")).toBe("tower");
    expect(
      legacyWorkshopDestination("/dashboard/shop/workshop/unknown"),
    ).toBe("/dashboard/shop/supply-chain?view=tower");
  });
});
