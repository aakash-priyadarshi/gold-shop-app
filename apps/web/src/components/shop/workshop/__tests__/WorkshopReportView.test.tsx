import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkshopReportView } from "../WorkshopReportView";

vi.mock("@/providers/translation-provider", () => ({ useT: () => (value: string) => value }));
vi.mock("@/components/ui/T", () => ({ T: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

describe("WorkshopReportView", () => {
  it("keeps CAD, recommendation and measured physical input visibly separate", () => {
    render(<WorkshopReportView report={{
      treeId: "tree-1", reconciliationState: "RECONCILIATION_PENDING",
      theoreticalCadGrams: "50.000000", actualInputGrams: "60.000000",
      recommendedInputsByMaterial: { goldGrains995: "55.280000" },
      actualInputsByMaterial: { goldGrains995: "55.300000" },
      balancesByMaterial: { goldGrains995: { WIP: "55.300000" } },
      unclassifiedGrams: "0.000000", outstandingWipGrams: "55.300000", inTransitGrams: "0.000000",
    }} />);

    expect(screen.getByText(/CAD theoretical/)).toHaveTextContent("50.000000 g");
    expect(screen.getByRole("columnheader", { name: "Recommended (reference)" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Actually issued" })).toBeInTheDocument();
    expect(screen.getByText("55.280000 g")).toBeInTheDocument();
    expect(screen.getAllByText("55.300000 g").length).toBeGreaterThan(0);
  });
});
