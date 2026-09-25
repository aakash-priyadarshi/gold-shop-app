import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { KarigarJobGoldCard } from "./KarigarJobGoldCard";
import { karigarApi } from "@/lib/api";

vi.mock("@/components/ui/T", () => ({ T: ({ children }: any) => <>{children}</> }));
vi.mock("@/providers/translation-provider", () => ({ useT: () => (value: string) => value }));
vi.mock("@/hooks/useMarket", () => ({ useMarket: () => ({ selectedCurrency: "NPR" }) }));
vi.mock("./JobCostSummaryModal", () => ({ JobCostSummaryModal: () => null }));
vi.mock("@/lib/api", () => ({ karigarApi: { updateTree: vi.fn() } }));

describe("KarigarJobGoldCard traceable tree", () => {
  it("submits only theoretical tree settings and hides typed physical weights", async () => {
    vi.mocked(karigarApi.updateTree).mockResolvedValue({ data: {} } as never);
    render(<KarigarJobGoldCard
      job={{ id: "job-1", product: "Ring", artisan: "Maker", status: "PENDING", metalKey: "goldGrains995",
        trees: [{ id: "tree-1", label: "Tree", metalKey: "goldGrains995", issuedGrams: 0, finishedGrams: 0,
          sprueButtonGrams: 0, recoverableGrams: 0, allowedWastagePercent: 1 }] }}
      traceableLedger onChanged={() => {}} onEdit={() => {}} onDelete={() => {}}
    />);
    expect(screen.queryByLabelText("Finished g")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save tree" }));
    await waitFor(() => expect(karigarApi.updateTree).toHaveBeenCalledWith("job-1", "tree-1", { allowedWastagePercent: 1 }));
  });
});
