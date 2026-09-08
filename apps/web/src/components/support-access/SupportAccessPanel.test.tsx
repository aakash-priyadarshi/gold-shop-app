import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupportAccessPanel } from "./SupportAccessPanel";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  t: (value: string) => value,
}));
vi.mock("@/lib/api", () => ({ api: { get: mocks.get, post: mocks.post } }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "seller", role: "SHOPKEEPER" } }),
}));
vi.mock("@/providers/translation-provider", () => ({ useT: () => mocks.t }));
vi.mock("@/components/ui/T", () => ({ T: ({ children }: any) => children }));
vi.mock("@/lib/support-session", () => ({
  getSupportToken: () => null,
  storeSupportToken: vi.fn(),
}));

describe("Seller support consent", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.post.mockResolvedValue({ data: {} });
    mocks.get.mockImplementation(async (url: string) => ({
      data: url.endsWith("/options")
        ? {
            permissions: [
              {
                id: "inventory.edit",
                label: "Edit existing products",
                description: "Change details and prices",
              },
              {
                id: "invoices.create",
                label: "Create invoices",
                description: "Creates real invoices",
              },
            ],
          }
        : url.includes("/context/")
          ? {
              admin: { id: "admin", firstName: "Aakash", lastName: "Admin" },
              sellerId: "seller",
              shops: [{ id: "shop", shopName: "Example Jewellers" }],
            }
          : [],
    }));
  });
  async function openForm() {
    render(<SupportAccessPanel conversationId="chat" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Grant support access" }),
    );
    fireEvent.change(screen.getByLabelText("Reason for access"), {
      target: { value: "Diagnose invoice issue" },
    });
  }
  it("defaults to read-only and disables screen recording", async () => {
    await openForm();
    expect(screen.getByLabelText("Allow selected changes")).not.toBeChecked();
    expect(screen.getByLabelText("Screen recording — off")).toBeDisabled();
    expect(screen.getByLabelText("Screen recording — off")).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Allow access" }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/support-access/grants",
        expect.objectContaining({
          shopId: "shop",
          conversationId: "chat",
          permissions: [],
        }),
      ),
    );
  });
  it("submits only the selected changes and the displayed duration", async () => {
    await openForm();
    fireEvent.change(screen.getByLabelText("Allow access for"), {
      target: { value: "2160" },
    });
    fireEvent.click(screen.getByLabelText("Allow selected changes"));
    fireEvent.click(screen.getByText("Edit existing products"));
    fireEvent.click(screen.getByRole("button", { name: "Allow access" }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalled());
    const payload = mocks.post.mock.calls[0][1];
    expect(payload.permissions).toEqual(["inventory.edit"]);
    expect(Date.parse(payload.expiresAt) - Date.now()).toBeGreaterThan(
      89 * 86400000,
    );
    expect(payload).not.toHaveProperty("recordingEnabled");
  });
  it("drops all write permissions when selected changes is turned off", async () => {
    await openForm();
    fireEvent.click(screen.getByLabelText("Allow selected changes"));
    fireEvent.click(screen.getByText("Create invoices"));
    fireEvent.click(screen.getByLabelText("Allow selected changes"));
    fireEvent.click(screen.getByRole("button", { name: "Allow access" }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/support-access/grants",
        expect.objectContaining({ permissions: [] }),
      ),
    );
  });
});
