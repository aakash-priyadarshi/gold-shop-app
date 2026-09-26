import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkshopSettingsModule } from "../settings/WorkshopSettingsModule";
import { WorkshopTransfersModule } from "../transfers/WorkshopTransfersModule";
import { WorkshopRecoveryModule } from "../recovery/WorkshopRecoveryModule";
import { WorkshopProductionFloor } from "../production/WorkshopProductionFloor";
import { workshopApi } from "@/lib/workshop-api";

vi.mock("@/components/ui/T", () => ({
  T: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/providers/translation-provider", () => ({
  useT: () => (str: string) => str,
}));

vi.mock("@/lib/workshop-api", () => ({
  workshopApi: {
    catalog: vi.fn(),
    createRoute: vi.fn(),
    jobs: vi.fn(),
    transfers: vi.fn(),
    recoveryBags: vi.fn(),
    prepareTransfer: vi.fn(),
    createRecoveryBag: vi.fn(),
    runReport: vi.fn(),
  },
}));

describe("Workshop Settings, Transfers, and Production Material Consistency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes Routes tab and creates route with definitionIds, dispatching catalog update", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    vi.mocked(workshopApi.catalog).mockResolvedValue({
      data: {
        materials: [],
        recipes: [],
        processes: [
          { id: "proc-1", name: "Casting", department: "Foundry", isActive: true },
          { id: "proc-2", name: "Filing", department: "Bench", isActive: true },
        ],
        routes: [
          {
            id: "rt-1",
            name: "Default Ring Route",
            isActive: true,
            steps: [
              { id: "s-1", position: 0, definitionId: "proc-1", status: "ACTIVE" },
            ],
          },
        ],
        workstations: [],
        tolerances: [],
        devices: [],
      },
    } as any);

    vi.mocked(workshopApi.createRoute).mockResolvedValue({
      data: { id: "rt-2", name: "Custom Fabrication", isActive: true, steps: [] },
    } as any);

    render(<WorkshopSettingsModule />);

    // Wait for catalog load and click Routes tab
    await waitFor(() => expect(screen.getByText("Routes")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Routes"));

    // Verify existing route is visible
    expect(screen.getByText("Default Ring Route")).toBeInTheDocument();

    // Fill in route form
    const nameInput = screen.getByPlaceholderText(/Standard Ring Fabrication/);
    fireEvent.change(nameInput, { target: { value: "New Ring Workflow" } });

    // Select process step
    const processSelect = screen.getByDisplayValue("Select process to add...");
    fireEvent.change(processSelect, { target: { value: "proc-1" } });

    const addStepButton = screen.getByText("Add Step");
    fireEvent.click(addStepButton);

    // Verify step appears in ordered list
    expect(screen.getAllByText(/1\.\s*Casting/).length).toBeGreaterThanOrEqual(1);

    // Create route
    const createRouteButton = screen.getByText("Create Route");
    fireEvent.click(createRouteButton);

    await waitFor(() => {
      expect(workshopApi.createRoute).toHaveBeenCalledWith({
        name: "New Ring Workflow",
        definitionIds: ["proc-1"],
      });
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: "workshop-catalog-updated" })
      );
    });
    dispatchSpy.mockRestore();
  });

  it("disables transfer preparation when catalog has no active materials", async () => {
    vi.mocked(workshopApi.transfers).mockResolvedValue({ data: [] } as any);
    vi.mocked(workshopApi.jobs).mockResolvedValue({
      data: [
        {
          id: "job-1",
          product: "Gold Ring",
          status: "IN_PROGRESS",
          trees: [{ id: "tree-1", label: "Tree #1" }],
        },
      ],
    } as any);
    vi.mocked(workshopApi.catalog).mockResolvedValue({
      data: {
        materials: [], // Empty materials
        recipes: [],
        processes: [],
        routes: [],
        workstations: [],
        tolerances: [],
        devices: [],
      },
    } as any);

    render(<WorkshopTransfersModule />);

    await waitFor(() => expect(screen.getByText("Prepare Transfer")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Prepare Transfer"));

    // Should indicate no materials available
    expect(screen.getByText("No active materials available for transfer")).toBeInTheDocument();

    // Submit button inside modal should be disabled
    const prepareSubmit = screen.getAllByText("Prepare Transfer").find(
      (el) => el.tagName.toLowerCase() === "button" && el.closest(".fixed")
    );
    expect(prepareSubmit).toBeDisabled();
  });

  it("disables recovery bag creation when no active gold materials exist", async () => {
    vi.mocked(workshopApi.recoveryBags).mockResolvedValue({ data: [] } as any);
    vi.mocked(workshopApi.catalog).mockResolvedValue({
      data: {
        materials: [
          { id: "m-stone", key: "diamondRound", name: "Round Diamond", kind: "STONE", scalePurpose: "STONE", isActive: true },
        ],
        recipes: [],
        processes: [],
        routes: [],
        workstations: [],
        tolerances: [],
        devices: [],
      },
    } as any);

    render(<WorkshopRecoveryModule />);

    await waitFor(() => expect(screen.getByText("Open New Recovery Bag")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Open New Recovery Bag"));

    expect(screen.getByText("No active gold materials available in factory catalog")).toBeInTheDocument();
    const openBagButton = screen.getByText("Open Bag").closest("button");
    expect(openBagButton).toBeDisabled();
  });

  it("clears selected recovery bag on production floor when switching material to a non-matching material", async () => {
    vi.mocked(workshopApi.jobs).mockResolvedValue({
      data: [
        {
          id: "job-1",
          product: "Solitaire Ring",
          status: "IN_PROGRESS",
          trees: [{ id: "tree-1", label: "Tree #1" }],
          workshopProcessRuns: [
            { id: "run-1", treeId: "tree-1", definitionId: "proc-1", status: "OPEN" },
          ],
        },
      ],
    } as any);
    vi.mocked(workshopApi.catalog).mockResolvedValue({
      data: {
        materials: [
          { id: "m-gold", key: "goldGrains995", name: "Fine Gold 995", kind: "GOLD", scalePurpose: "GOLD", isActive: true },
          { id: "m-alloy", key: "masterAlloy", name: "Master Alloy", kind: "ALLOY", scalePurpose: "GOLD", isActive: true },
        ],
        recipes: [],
        processes: [{ id: "proc-1", name: "Polishing", department: "Polishing", isActive: true }],
        routes: [],
        workstations: [],
        tolerances: [],
        devices: [],
      },
    } as any);
    vi.mocked(workshopApi.recoveryBags).mockResolvedValue({
      data: [
        { id: "bag-gold", code: "RB-GOLD-1", materialKey: "goldGrains995", status: "OPEN" },
        { id: "bag-alloy", code: "RB-ALLOY-1", materialKey: "masterAlloy", status: "OPEN" },
      ],
    } as any);

    render(<WorkshopProductionFloor initialDept="ALL" />);

    // Wait for load and select Recovery Deposit action
    await waitFor(() => expect(screen.getByText("Recovery Deposit")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Recovery Deposit"));

    // Recovery bag selector should be visible
    await waitFor(() => expect(screen.getByText("Select open bag")).toBeInTheDocument());
    const bagSelect = screen.getByDisplayValue("Select open bag") as HTMLSelectElement;

    // Select the gold bag
    fireEvent.change(bagSelect, { target: { value: "bag-gold" } });
    expect(bagSelect.value).toBe("bag-gold");

    // Switch physical material to masterAlloy
    const materialSelect = screen.getByDisplayValue("Fine Gold 995 (goldGrains995)") as HTMLSelectElement;
    fireEvent.change(materialSelect, { target: { value: "masterAlloy" } });

    // Bag selection must be cleared because bag-gold does not match masterAlloy!
    await waitFor(() => {
      expect(bagSelect.value).toBe("");
    });
  });
});
