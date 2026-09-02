import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UnsubscribePage from "./page";

const mocks = vi.hoisted(() => ({
  unsubscribe: vi.fn(),
  get: vi.fn(),
}));

vi.mock("@/components/ui/T", () => ({
  T: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/providers/translation-provider", () => ({
  useT: () => (value: string) => value,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mocks.get }),
}));

vi.mock("@/lib/api", () => ({
  recoveryOffersApi: {
    unsubscribe: mocks.unsubscribe,
  },
}));

describe("UnsubscribePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockReturnValue("user-1.signature");
    mocks.unsubscribe.mockResolvedValue({
      data: { unsubscribed: true, alreadyUnsubscribed: false },
    });
  });

  it("unsubscribes with the token from the link", async () => {
    render(<UnsubscribePage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Unsubscribe from offer emails" }),
    );

    await waitFor(() => {
      expect(mocks.unsubscribe).toHaveBeenCalledWith("user-1.signature");
    });
    expect(
      await screen.findByText(
        "You will not receive future Orivraa product offer emails.",
      ),
    ).toBeInTheDocument();
  });
});
