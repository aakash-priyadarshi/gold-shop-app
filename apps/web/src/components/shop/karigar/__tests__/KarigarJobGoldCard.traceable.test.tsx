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
});
