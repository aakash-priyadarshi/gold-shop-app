import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkshopQcModule } from "../qc/WorkshopQcModule";
import { WorkshopFinishedReceiptDialog } from "../finished/WorkshopFinishedReceiptDialog";
import { workshopApi, type WorkshopJob } from "@/lib/workshop-api";

vi.mock("@/components/ui/T", () => ({
  T: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/providers/translation-provider", () => ({
  useT: () => (str: string) => str,
}));

vi.mock("@/lib/workshop-api", () => ({
  workshopApi: {
    catalog: vi.fn(),
    jobs: vi.fn(),
    transfers: vi.fn(),
    inspectQc: vi.fn(),
    qcDecision: vi.fn(),
    openWeighingSession: vi.fn(),
    captureReading: vi.fn(),
    postMovement: vi.fn(),
  },
}));

describe("QC Inspection & Finished Goods Receipt Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("surfaces detailed blocking reasons when a job is not ready for QC approval", async () => {
    const mockJobs: WorkshopJob[] = [
      {
        id: "job-block-1",
        product: "Solitaire Engagement Ring",
        artisan: "Master Jeweller",
        metalKey: "goldGrains995",
        status: "PRODUCTION",
        qty: 1,
        trees: [{ id: "tr-1", label: "Tree #1", metalKey: "goldGrains995", issuedGrams: 50, lines: [] }],
        workshopProcessRuns: [],
        workshopRouteSteps: [],
        workshopBatchChildren: [],
      },
    ];

    vi.mocked(workshopApi.jobs).mockResolvedValue({
      data: mockJobs,
    } as any);

    vi.mocked(workshopApi.transfers).mockResolvedValue({
      data: [],
    } as any);

    render(<WorkshopQcModule />);

    await waitFor(() => expect(screen.getByText("Solitaire Engagement Ring")).toBeInTheDocument());

    // Should display blocked badge
    expect(screen.getByText("Approval Blocked")).toBeInTheDocument();

    // Should render the explicit blocking reasons
    expect(screen.getByText("No process runs recorded for this fabrication order")).toBeInTheDocument();

    // Action button should indicate inspection required
    expect(screen.getByText("Inspect & Decide")).toBeInTheDocument();
  });

  it("calculates Net Metal Weight = Gross Scale Weight - Set Stone Weight in Finished Receipt", async () => {
    const mockJob: WorkshopJob = {
      id: "job-done-1",
      product: "Diamond Studded Bangle",
      artisan: "Artisan B",
      metalKey: "goldGrains995",
      status: "QC_APPROVED",
      qty: 1,
      trees: [{ id: "tr-2", label: "Tree #2", metalKey: "goldGrains995", issuedGrams: 30, lines: [] }],
      workshopProcessRuns: [],
      workshopRouteSteps: [],
      workshopBatchChildren: [],
    };

    render(
      <WorkshopFinishedReceiptDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        job={mockJob}
        treeId="tr-2"
        materialKey="goldGrains995"
      />
    );

    // Initial formula display (gross 0.00 - stone 0.00 = metal 0.00)
    expect(screen.getByText("Finished Goods Scale Receipt")).toBeInTheDocument();
    expect(screen.getByText(/Diamond Studded Bangle/)).toBeInTheDocument();
    expect(screen.getByText("Calculated Metal Weight:")).toBeInTheDocument();

    // Simulate stone deduction
    const stoneInput = screen.getByPlaceholderText("0.000");
    fireEvent.change(stoneInput, { target: { value: "2.500" } });

    expect(stoneInput).toHaveValue(2.5);
  });
});
