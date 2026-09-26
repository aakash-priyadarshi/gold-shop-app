import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkshopMetalModule } from "../metal/WorkshopMetalModule";
import { workshopApi } from "@/lib/workshop-api";

vi.mock("@/components/ui/T", () => ({ T: ({ children }: any) => <>{children}</> }));
vi.mock("@/providers/translation-provider", () => ({ useT: () => (text: string) => text }));
vi.mock("../shared/TransactionCorrectionDialog", () => ({ TransactionCorrectionDialog: () => null }));
vi.mock("@/lib/workshop-api", () => ({ workshopApi: {
  accounts: vi.fn().mockResolvedValue({ data: [] }),
  cutoverStatus: vi.fn().mockResolvedValue({ data: null }),
  reports: vi.fn(),
} }));

describe("Workshop correction tour anchor", () => {
  it.each([
    { canApprove: true, hasRows: false },
    { canApprove: false, hasRows: true },
    { canApprove: true, hasRows: true },
  ])("has one visible stable section for $canApprove / $hasRows", async ({ canApprove, hasRows }) => {
    vi.mocked(workshopApi.reports).mockResolvedValue({ data: { correctionHistory: hasRows ? [
      { id: "reversed", entryNumber: 1, referenceType: "MATERIAL_ISSUE", materialKey: "goldGrains995", weightGrams: "10", postedAt: "2026-09-26", reversedBy: { id: "reversal" } },
      { id: "active", entryNumber: 2, referenceType: "MATERIAL_ISSUE", materialKey: "goldGrains995", weightGrams: "10", postedAt: "2026-09-26" },
    ] : [] } } as any);
    const { container } = render(<WorkshopMetalModule canApprove={canApprove} />);
    await screen.findByText("Traceable Transactions & Corrections Audit");
    const anchors = container.querySelectorAll('[data-tour="workshop-metal-corrections"]');
    expect(anchors).toHaveLength(1);
    expect(anchors[0]).toBeVisible();
    expect(anchors[0].tagName).not.toBe("TD");
    expect(screen.queryAllByRole("button", { name: "Correct" })).toHaveLength(canApprove && hasRows ? 1 : 0);
  });
});
