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
    createWorkshop: vi.fn(),
    saveSnapshot: vi.fn(),
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

    it("quick-adds only an artisan identity, selects the result, then creates the job", async () => {
      vi.mocked(karigarApi.getSnapshot).mockResolvedValue({ data: {
        workshops: [], vaultReserves: { goldGrains24k: 500 },
        jobs: [{ id: "existing-job" }], customMaterials: [{ key: "silver" }],
      } } as any);
      vi.mocked(karigarApi.createWorkshop).mockResolvedValue({ data: { id: "server-workshop", name: "New Workshop", artisan: "New Artisan" } } as any);
      vi.mocked(karigarApi.createJob).mockResolvedValue({ data: { id: "new-job" } } as any);
      render(<WorkshopCreateJobDialog open onOpenChange={vi.fn()} />);
      fireEvent.click(await screen.findByRole("button", { name: "Add Karigar" }));
      fireEvent.change(screen.getByPlaceholderText("e.g. Ramesh Soni"), { target: { value: " New Artisan " } });
      fireEvent.change(screen.getByPlaceholderText("e.g. Ramesh Workshop"), { target: { value: " New Workshop " } });
      fireEvent.click(screen.getByRole("button", { name: "Save Karigar & Continue" }));
      await waitFor(() => expect(screen.getByLabelText(/Karigar \/ Workshop/)).toHaveValue("server-workshop"));
      expect(karigarApi.createWorkshop).toHaveBeenCalledWith({ name: "New Workshop", artisan: "New Artisan" });
      expect(karigarApi.saveSnapshot).not.toHaveBeenCalled();
      expect(karigarApi.getSnapshot).toHaveBeenCalledTimes(1);
      fireEvent.change(screen.getByPlaceholderText("e.g. 22K Traditional Bridal Choker"), { target: { value: "Ring" } });
      fireEvent.click(screen.getByRole("button", { name: "Create Work Order" }));
      await waitFor(() => expect(karigarApi.createJob).toHaveBeenCalledWith(expect.objectContaining({ workshopId: "server-workshop", artisan: "New Artisan", product: "Ring", metalKey: "goldGrains995" })));
    });

    it("keeps errors and Quick Add state when selecting a different workshop without reloading", async () => {
      vi.mocked(karigarApi.getSnapshot).mockResolvedValue({ data: { workshops: [
        { id: "one", name: "One", artisan: "One" }, { id: "two", name: "Two", artisan: "Two" },
      ] } } as any);
      vi.mocked(karigarApi.createWorkshop).mockRejectedValue({ response: { data: { message: "Workshop creation unavailable" } } });
      render(<WorkshopCreateJobDialog open onOpenChange={vi.fn()} />);
      fireEvent.click(await screen.findByRole("button", { name: "New Karigar" }));
      fireEvent.change(screen.getByPlaceholderText("Artisan name"), { target: { value: "New Artisan" } });
      fireEvent.change(screen.getByPlaceholderText("Workshop name"), { target: { value: "New Workshop" } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(await screen.findByText("Workshop creation unavailable")).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/Karigar \/ Workshop/), { target: { value: "two" } });
      expect(screen.getByText("Workshop creation unavailable")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Artisan name")).toHaveValue("New Artisan");
      expect(karigarApi.getSnapshot).toHaveBeenCalledTimes(1);
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
