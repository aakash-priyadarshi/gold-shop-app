import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkshopSettingsModule } from "../settings/WorkshopSettingsModule";
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
    createMaterial: vi.fn(),
    createRecipe: vi.fn(),
    createProcessDefinition: vi.fn(),
    createWorkstation: vi.fn(),
    configureTolerance: vi.fn(),
    inviteStaff: vi.fn(),
  },
}));

describe("Alloy Recipe Builder & Composition Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workshopApi.catalog).mockResolvedValue({
      data: {
        materials: [
          { id: "m-1", key: "goldGrains995", name: "Fine Gold 995", kind: "GOLD_995", scalePurpose: "GOLD" },
          { id: "m-2", key: "masterAlloyYellow", name: "Master Alloy 22K Yellow", kind: "ALLOY", scalePurpose: "GOLD" },
        ],
        recipes: [],
        definitions: [],
        routes: [],
        workstations: [],
        tolerances: [],
        devices: [],
        staffAssignments: [],
        staffInvitations: [],
      },
    } as any);
  });

  it("calculates Master Alloy component sum and enforces 100% total validation", async () => {
    render(<WorkshopSettingsModule />);

    // Switch to Recipes tab
    await waitFor(() => expect(screen.getByText("Alloy Recipes")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Alloy Recipes"));

    // Open Create Recipe modal
    const createButton = screen.getByText("Create Recipe");
    fireEvent.click(createButton);

    // Enter recipe name
    const recipeNameInput = screen.getByPlaceholderText("e.g. 22K Yellow Gold (Export Grade)");
    fireEvent.change(recipeNameInput, { target: { value: "22K Standard Yellow" } });

    // Verify initial preset loaded has 100%
    expect(screen.getByText("100.0% / 100%")).toBeInTheDocument();

    // Change silver share to 60% (making total 105%)
    const silverPercentInputs = screen.getAllByRole("spinbutton");
    // First spinbutton in the composition list is Silver (55%)
    fireEvent.change(silverPercentInputs[0], { target: { value: "60" } });

    // Now total should be 105% and marked invalid
    await waitFor(() => {
      expect(screen.getByText("105.0% / 100%")).toBeInTheDocument();
    });

    // Save button should be disabled because 105% !== 100%
    const saveButton = screen.getByText("Save Recipe");
    expect(saveButton).toBeDisabled();

    // Adjust back to 55% so it's exactly 100%
    fireEvent.change(silverPercentInputs[0], { target: { value: "55" } });
    await waitFor(() => {
      expect(screen.getByText("100.0% / 100%")).toBeInTheDocument();
    });
    expect(saveButton).not.toBeDisabled();
  });

  it("applies recipe presets cleanly (Rose Gold, White Gold, Yellow Gold)", async () => {
    render(<WorkshopSettingsModule />);

    await waitFor(() => expect(screen.getByText("Alloy Recipes")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Alloy Recipes"));

    // Open Create Recipe modal
    const createButton = screen.getByText("Create Recipe");
    fireEvent.click(createButton);

    // Click 18K White preset
    const whitePreset = screen.getByText("18K White");
    fireEvent.click(whitePreset);

    // Verify preset changed name and purity
    const recipeNameInput = screen.getByPlaceholderText("e.g. 22K Yellow Gold (Export Grade)") as HTMLInputElement;
    expect(recipeNameInput.value).toBe("18K White Gold");

    const purityInput = screen.getByDisplayValue("0.750000") as HTMLInputElement;
    expect(purityInput).toBeInTheDocument();

    // Total should remain 100% balanced
    expect(screen.getByText("100.0% / 100%")).toBeInTheDocument();
  });
});
