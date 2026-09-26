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
    confirm: vi.fn(),
  },
}));

vi.mock("../shared/ScaleCapturePanel", () => ({
  ScaleCapturePanel: ({ onCaptured }: any) => <button onClick={() => onCaptured("session-1", "reading-1", "30.000")}>{"Capture test reading"}</button>,
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
        currentStage: "QC",
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

  it("confirms finished receipt using the captured session and server-derived stone weight", async () => {
    const mockJob: WorkshopJob = {
      id: "job-done-1",
      product: "Diamond Studded Bangle",
      artisan: "Artisan B",
      metalKey: "goldGrains995",
      status: "QC_APPROVED",
      currentStage: "QC",
      qty: 1,
      trees: [{ id: "tr-2", label: "Tree #2", metalKey: "goldGrains995", issuedGrams: 30, lines: [] }],
      workshopProcessRuns: [],
      workshopRouteSteps: [],
      workshopBatchChildren: [],
    };

    vi.mocked(workshopApi.confirm).mockResolvedValue({ data: { journal: { id: "journal-1" }, inventoryItem: { id: "item-1" } } } as any);
    const onSuccess = vi.fn();
    render(
      <WorkshopFinishedReceiptDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={onSuccess}
        job={mockJob}
      />
    );

    expect(screen.getByText("Finished Goods Scale Receipt")).toBeInTheDocument();
    expect(screen.getByText(/Diamond Studded Bangle/)).toBeInTheDocument();
    expect(screen.getByText("Calculated Metal Weight:")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("0.000")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Capture test reading"));
    fireEvent.click(screen.getByText("Confirm Receipt & Create Stock"));
    await waitFor(() => expect(workshopApi.confirm).toHaveBeenCalledWith("session-1", {
      readingId: "reading-1",
      finishedGoods: { nameEn: "Diamond Studded Bangle", jewelleryType: "RING" },
    }));
    expect(onSuccess).toHaveBeenCalledWith("item-1");
  });
});
