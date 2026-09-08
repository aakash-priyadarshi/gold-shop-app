import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupportSessionBanner } from "./SupportSessionBanner";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  exit: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: { get: mocks.get, post: mocks.post },
}));
vi.mock("@/lib/support-session", () => ({
  getSupportToken: () => `osa_${"a".repeat(64)}`,
  exitSupportSession: mocks.exit,
}));
vi.mock("@/components/ui/T", () => ({
  T: ({ children }: { children: React.ReactNode }) => children,
}));

const failure = (status?: number) => ({
  response: status === undefined ? undefined : { status },
});

describe("Support session banner failures", () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.exit.mockReset();
  });

  it("keeps the support session through server and offline failures", async () => {
    mocks.get.mockRejectedValue(failure(500));
    mocks.post.mockRejectedValue(failure());
    render(<SupportSessionBanner />);
    await waitFor(() => expect(mocks.get).toHaveBeenCalled());
    fireEvent.pointerDown(window);
    await waitFor(() => expect(mocks.post).toHaveBeenCalled());
    expect(mocks.exit).not.toHaveBeenCalled();
  });

  it("exits when session status polling is forbidden", async () => {
    mocks.get.mockRejectedValue(failure(403));
    render(<SupportSessionBanner />);
    await waitFor(() => expect(mocks.exit).toHaveBeenCalledOnce());
  });

  it("treats a missing permissions array as read-only", async () => {
    mocks.get.mockResolvedValue({
      data: {
        shopName: "Shop",
        adminName: "Admin",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    render(<SupportSessionBanner />);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Read-only"),
    );
    expect(mocks.exit).not.toHaveBeenCalled();
  });

  it("exits when activity authentication fails", async () => {
    mocks.get.mockResolvedValue({
      data: {
        shopName: "Shop",
        adminName: "Admin",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        permissions: [],
      },
    });
    mocks.post.mockRejectedValue(failure(401));
    render(<SupportSessionBanner />);
    fireEvent.pointerDown(window);
    await waitFor(() => expect(mocks.exit).toHaveBeenCalledOnce());
  });
});
