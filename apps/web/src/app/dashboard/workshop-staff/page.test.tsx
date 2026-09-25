import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WorkshopStaffPage from "./page";
import { workshopApi } from "@/lib/workshop-api";

vi.mock("@/components/auth/RouteGuard", () => ({ RouteGuard: ({ children }: any) => <>{children}</> }));
vi.mock("@/components/shop/workshop/FactoryWorkbench", () => ({ FactoryWorkbench: () => <div data-testid="staff-workbench" /> }));
vi.mock("@/components/ui/T", () => ({ T: ({ children }: any) => <>{children}</> }));
vi.mock("@/providers/translation-provider", () => ({ useT: () => (value: string) => value }));
vi.mock("@/lib/workshop-api", () => ({
  workshopApi: { myAssignments: vi.fn(), myInvitations: vi.fn() },
  selectStaffWorkshop: vi.fn(),
}));

describe("Workshop staff station", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workshopApi.myInvitations).mockResolvedValue({ data: [] } as never);
  });

  it.each(["LEGACY", "TRACEABLE"])("gates the factory workbench on %s ledger status", async (version) => {
    vi.mocked(workshopApi.myAssignments).mockResolvedValue({ data: [{
      shopId: "shop-1", shopName: "Factory", staffRole: "INVENTORY", workshopMode: true,
      workshopLedgerVersion: version, permissions: { workshopCapture: true },
    }] } as never);
    render(<WorkshopStaffPage />);
    await waitFor(() => expect(screen.getByRole("option", { name: "Factory · INVENTORY" })).toBeInTheDocument());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "shop-1" } });
    if (version === "TRACEABLE") expect(screen.getByTestId("staff-workbench")).toBeInTheDocument();
    else {
      expect(screen.queryByTestId("staff-workbench")).not.toBeInTheDocument();
      expect(screen.getByText("The shop owner must enable TRACEABLE Workshop Mode first.")).toBeInTheDocument();
    }
  });
});
