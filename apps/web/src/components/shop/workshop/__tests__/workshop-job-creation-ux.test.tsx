import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkshopCreateJobDialog } from "../jobs/WorkshopCreateJobDialog";
import {
  WorkshopDomainTooltip,
  WORKSHOP_GLOSSARY,
} from "../shared/WorkshopDomainTooltip";
import { karigarApi } from "@/lib/api";

vi.mock("@/components/ui/T", () => ({
  T: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/providers/translation-provider", () => ({
  useT: () => (str: string) => str,
}));

vi.mock("@/lib/api", () => ({
  karigarApi: {
    getSnapshot: vi.fn(),
    createJob: vi.fn(),
    persistSnapshot: vi.fn(),
  },
}));

describe("Workshop Job Creation UX & Domain Tooltips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("WorkshopDomainTooltip", () => {
    it("renders the help info icon button for valid term", () => {
      render(<WorkshopDomainTooltip term="gold995" />);
      expect(screen.getByRole("button", { name: "Help info" })).toBeInTheDocument();
    });

    it("has glossary definitions for key workshop terms", () => {
      expect(WORKSHOP_GLOSSARY.gold995).toContain("0.995 fine gold");
      expect(WORKSHOP_GLOSSARY.actual).toContain("scale reading");
      expect(WORKSHOP_GLOSSARY.recommended).toContain("production recipe");
      expect(WORKSHOP_GLOSSARY.capture).toContain("Stores the stable");
      expect(WORKSHOP_GLOSSARY.confirm).toContain("Authoritative posting");
      expect(WORKSHOP_GLOSSARY.recoveryPending).toContain("recovery/refining");
    });
  });

  describe("WorkshopCreateJobDialog", () => {
    it("renders no-karigar banner when artisan list is empty", async () => {
      vi.mocked(karigarApi.getSnapshot).mockResolvedValue({
        data: {
          workshops: [],
          jobs: [],
          vault: {},
        },
      } as any);

      render(<WorkshopCreateJobDialog open={true} onOpenChange={vi.fn()} />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "You need a Karigar/workshop before creating a manufacturing job.",
          ),
        ).toBeInTheDocument();
      });

      expect(screen.getByText("Add Karigar")).toBeInTheDocument();
    });

    it("renders artisan dropdown and handles successful job creation", async () => {
      vi.mocked(karigarApi.getSnapshot).mockResolvedValue({
        data: {
          workshops: [
            {
              id: "k-1",
              name: "Rajesh Works",
              artisan: "Rajesh Goldsmith",
            },
          ],
          jobs: [],
          vault: {},
        },
      } as any);

      vi.mocked(karigarApi.createJob).mockResolvedValue({
        data: { id: "job-101", jobNumber: "JOB-2026-001" },
      } as any);

      const onOpenChange = vi.fn();
      const onJobCreated = vi.fn();

      render(
        <WorkshopCreateJobDialog
          open={true}
          onOpenChange={onOpenChange}
          onJobCreated={onJobCreated}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("Create Manufacturing Job")).toBeInTheDocument();
      });

      // Wait until artisans are loaded and dropdown has selected the artisan
      await waitFor(() => {
        expect(screen.getByText(/Rajesh Works/)).toBeInTheDocument();
      });

      // Fill in product name
      const productInput = screen.getByPlaceholderText(
        "e.g. 22K Traditional Bridal Choker",
      );
      fireEvent.change(productInput, {
        target: { value: "22K Traditional Bridal Choker" },
      });

      // Submit form
      const submitButton = screen.getByRole("button", {
        name: "Create Work Order",
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(karigarApi.createJob).toHaveBeenCalledWith(
          expect.objectContaining({
            product: "22K Traditional Bridal Choker",
            workshopId: "k-1",
            qty: 1,
            priority: "NORMAL",
          }),
        );
      });

      await waitFor(() => {
        expect(
          screen.getByText("Work order created successfully!"),
        ).toBeInTheDocument();
      });
    });
  });
});
