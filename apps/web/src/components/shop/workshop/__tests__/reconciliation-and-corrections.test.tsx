import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReconciliationSummary } from "../shared/ReconciliationSummary";
import { TransactionCorrectionDialog } from "../shared/TransactionCorrectionDialog";
import { workshopApi, type WorkshopJournalEntry } from "@/lib/workshop-api";

vi.mock("@/components/ui/T", () => ({
  T: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/providers/translation-provider", () => ({
  useT: () => (str: string) => str,
}));

vi.mock("@/lib/workshop-api", () => ({
  workshopApi: {
    correctJournal: vi.fn(),
  },
}));

describe("Mass Balance Reconciliation & Dedicated Correction Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates Total Accounted and surfaces unclassified physical discrepancy", () => {
    render(
      <ReconciliationSummary
        totalInputGrams="500.8000"
        forwardWipGrams="420.0000"
        reusableGrams="50.0000"
        scrapGrams="5.0000"
        recoveryPendingGrams="20.0000"
        refineryGrams="3.0000"
        varianceGrams="1.8000"
        unclassifiedGrams="1.0000"
        reconciliationState="RECONCILIATION_PENDING"
      />
    );

    // Total Input = 500 + 0.8 = 500.8000g
    expect(screen.getByText(/500\.8000?\s*g/)).toBeInTheDocument();

    // Total Accounted = 420 + 50 + 5 + 20 + 3 + 1.8 = 499.8000g
    expect(screen.getByText(/499\.8000?\s*g/)).toBeInTheDocument();

    // Unclassified Remainder = 1.0000g -> ACTION REQUIRED badge
    expect(screen.getByText(/1\.0000?\s*g/)).toBeInTheDocument();
    expect(screen.getByText("ACTION REQUIRED")).toBeInTheDocument();
  });

  it("renders dedicated workflow correction dialog with safety warnings", () => {
    const mockTransferJournal: WorkshopJournalEntry = {
      id: "j-transfer-1",
      entryNumber: 104,
      status: "POSTED",
      referenceType: "TRANSFER_DISPATCH",
      referenceId: "tr-01",
      idempotencyKey: "idemp-1",
      description: "Transfer dispatch from Casting to Polishing",
      weightGrams: "250.000",
      materialKey: "goldGrains995",
      postedAt: new Date().toISOString(),
      lines: [],
    };

    render(
      <TransactionCorrectionDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        journal={mockTransferJournal}
      />
    );

    // Should detect TRANSFER_DISPATCH referenceType and display specific workflow context
    expect(screen.getByText("Correct Physical Transaction")).toBeInTheDocument();
    expect(screen.getByText("Transfer Dispatch Correction")).toBeInTheDocument();
    expect(screen.getByText(/Reversing this dispatch will restore the transfer to PREPARED status/)).toBeInTheDocument();

    // Reason input must be provided to submit
    const submitButton = screen.getByText("Post Corrected Replacement");
    expect(submitButton).toBeDisabled();

    const reasonInput = screen.getByPlaceholderText(/Scale reading recalibration/);
    fireEvent.change(reasonInput, { target: { value: "Scale tare miscalibration corrected with supervisor" } });

    // With replacement weight set
    const weightInput = screen.getByPlaceholderText("0.000");
    fireEvent.change(weightInput, { target: { value: "249.850" } });

    expect(submitButton).not.toBeDisabled();
  });

  it("submits workflow correction to workshopApi.correctJournal with idempotency", async () => {
    vi.mocked(workshopApi.correctJournal).mockResolvedValue({
      data: {
        originalJournal: { id: "j-1", status: "REVERSED" },
        reversalJournal: { id: "j-rev-1", status: "POSTED" },
        replacementJournal: { id: "j-rep-1", status: "POSTED" },
      },
    } as any);

    const onSuccess = vi.fn();
    const mockJournal: WorkshopJournalEntry = {
      id: "j-proc-1",
      entryNumber: 42,
      status: "POSTED",
      referenceType: "PROCESS_INPUT",
      referenceId: "run-01",
      idempotencyKey: "idemp-proc",
      description: "Input to Filing run",
      weightGrams: "100.000",
      materialKey: "goldGrains995",
      postedAt: new Date().toISOString(),
      lines: [],
    };

    render(
      <TransactionCorrectionDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={onSuccess}
        journal={mockJournal}
      />
    );

    const reasonInput = screen.getByPlaceholderText(/Scale reading recalibration/);
    fireEvent.change(reasonInput, { target: { value: "Weighed with wrong fixture weight included" } });

    const weightInput = screen.getByPlaceholderText("0.000");
    fireEvent.change(weightInput, { target: { value: "98.500" } });

    const submitButton = screen.getByText("Post Corrected Replacement");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(workshopApi.correctJournal).toHaveBeenCalledWith(
        "j-proc-1",
        expect.objectContaining({
          reason: "Weighed with wrong fixture weight included",
          replacementWeightGrams: "98.500",
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
