import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { WorkshopJobCardView } from "../WorkshopJobCardView";
import { karigarApi } from "@/lib/api";

vi.mock("@/components/shop/karigar/KarigarJobGoldCard", () => ({ KarigarJobGoldCard: () => <div data-testid="job-gold-card" /> }));
vi.mock("@/components/ui/T", () => ({ T: ({ children }: any) => <>{children}</> }));
vi.mock("@/providers/translation-provider", () => ({ useT: () => (value: string) => value }));
vi.mock("@/lib/api", () => ({ karigarApi: { getJob: vi.fn(), workshopCutoverStatus: vi.fn() } }));

describe("WorkshopJobCardView", () => {
  it("still shows the job but withholds physical controls when ledger status fails", async () => {
    vi.mocked(karigarApi.getJob).mockResolvedValue({ data: { id: "job-1", product: "Ring", artisan: "Maker", status: "PENDING" } } as never);
    vi.mocked(karigarApi.workshopCutoverStatus).mockRejectedValue(new Error("offline"));
    render(<WorkshopJobCardView jobId="job-1" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Ring" })).toBeInTheDocument());
    expect(screen.getByText("Could not load workshop ledger status")).toBeInTheDocument();
    expect(screen.queryByTestId("job-gold-card")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create inventory item" })).not.toBeInTheDocument();
  });
});
