import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { FactoryManagerControls } from "../FactoryManagerControls";
import { workshopApi } from "@/lib/workshop-api";

vi.mock("@/components/ui/T", () => ({ T: ({ children }: any) => <>{children}</> }));
vi.mock("@/providers/translation-provider", () => ({ useT: () => (value: string) => value }));
vi.mock("@/lib/workshop-api", () => ({ workshopApi: { manualMovement: vi.fn() } }));

describe("FactoryManagerControls audited posting", () => {
  it("reuses the manual movement key after a failed response", async () => {
    vi.mocked(workshopApi.manualMovement).mockRejectedValueOnce(new Error("Response lost"))
      .mockResolvedValue({ data: { id: "journal-1" } } as never);
    render(<FactoryManagerControls materials={[]} definitions={[]} routes={[]} steps={[]}
      accounts={[{ id: "vault-1", materialKey: "goldGrains995", bucket: "VAULT", scopeId: "", balanceGrams: "10.000000" }]}
      jobId="job-1" treeId="tree-1" runId="" onRefresh={async () => {}} />);

    fireEvent.change(screen.getByLabelText("Physical source account"), { target: { value: "vault-1" } });
    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "REUSABLE" } });
    fireEvent.change(screen.getByLabelText("Manual override grams"), { target: { value: "1.00" } });
    const button = screen.getByRole("button", { name: "Post owner manual override" });
    const form = button.parentElement!;
    fireEvent.change(within(form).getByLabelText("Reason", { exact: true }), { target: { value: "Scale outage" } });

    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Response lost"));
    fireEvent.click(button);
    await waitFor(() => expect(workshopApi.manualMovement).toHaveBeenCalledTimes(2));
    expect(vi.mocked(workshopApi.manualMovement).mock.calls[0][0].idempotencyKey)
      .toBe(vi.mocked(workshopApi.manualMovement).mock.calls[1][0].idempotencyKey);
  });
});
