import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { karigarApi } from "@/lib/api";
import { KarigarJobGoldCard } from "../KarigarJobGoldCard";

vi.mock("@/lib/api", () => ({
  karigarApi: {
    createTree: vi.fn(),
    updateTree: vi.fn(),
  },
}));

vi.mock("@/hooks/useMarket", () => ({
  useMarket: () => ({ selectedCurrency: "NPR" }),
}));

vi.mock("@/providers/translation-provider", () => ({
  useT: () => (text: string) => text,
  useTranslation: () => ({
    t: (text: string) => text,
    locale: "en",
    register: () => {},
    loading: false,
    hasTranslation: () => true,
  }),
}));

describe("KarigarJobGoldCard casting tree creation", () => {
  const job = {
    id: "job-1",
    product: "Gold ring",
    artisan: "Workshop",
    status: "IN_PROGRESS",
    metalKey: "goldGrains995",
    trees: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(karigarApi.createTree).mockResolvedValue({ data: { id: "tree-1" } } as never);
    vi.mocked(karigarApi.updateTree).mockResolvedValue({ data: {} } as never);
  });

  it("creates an empty Gold 995 tree without a typed issue weight in TRACEABLE mode", async () => {
    render(
      <KarigarJobGoldCard
        job={job}
        traceableLedger
        onChanged={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add casting tree" }));
    expect(screen.getByText("New Gold 995 casting tree")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Issued g" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save tree" }));

    await waitFor(() =>
      expect(karigarApi.createTree).toHaveBeenCalledWith("job-1", {
        issuedGrams: 0,
        metalKey: "goldGrains995",
        purity: "995",
        allowedWastagePercent: 1,
      }),
    );
    expect(karigarApi.updateTree).toHaveBeenCalledWith(
      "job-1",
      "tree-1",
      expect.not.objectContaining({ issuedGrams: expect.anything() }),
    );
  });

  it("keeps typed tree creation for LEGACY jobs", async () => {
    render(
      <KarigarJobGoldCard
        job={job}
        onChanged={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add casting tree" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Issued g" }), {
      target: { value: "12.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save tree" }));

    await waitFor(() =>
      expect(karigarApi.createTree).toHaveBeenCalledWith("job-1", {
        issuedGrams: 12.5,
        allowedWastagePercent: 1,
      }),
    );
  });

  it("does not offer typed 24K tree creation after TRACEABLE cutover", () => {
    render(
      <KarigarJobGoldCard
        job={{ ...job, metalKey: "goldGrains24k" }}
        traceableLedger
        onChanged={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Add casting tree" })).not.toBeInTheDocument();
    expect(screen.getByText("New TRACEABLE casting trees require a Gold 995 work order.")).toBeInTheDocument();
    expect(karigarApi.createTree).not.toHaveBeenCalled();
  });

  it("does not expose typed physical fields on an existing 24K tree after cutover", () => {
    render(
      <KarigarJobGoldCard
        job={{
          ...job,
          trees: [{
            id: "tree-24k", label: "24K tree", metalKey: "goldGrains24k",
            issuedGrams: 12.5, finishedGrams: 0, sprueButtonGrams: 0,
            recoverableGrams: 0, allowedWastagePercent: 1,
          }],
        }}
        traceableLedger
        onChanged={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText("24K tree")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Issued g" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Finished g" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Allowed %" })).toHaveValue("1");
  });
});
