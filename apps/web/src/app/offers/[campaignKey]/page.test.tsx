import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FestivalOfferPage from "./page";

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  getCampaign: vi.fn(),
  claim: vi.fn(),
  refreshUser: vi.fn(),
}));

vi.mock("@/components/ui/T", () => ({
  T: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/providers/translation-provider", () => ({
  useT: () => (value: string) => value,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ campaignKey: "festival-dashain-2026" }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    refreshUser: mocks.refreshUser,
  }),
}));

vi.mock("@/lib/api", () => ({
  recoveryOffersApi: {
    lookup: mocks.lookup,
    getCampaign: mocks.getCampaign,
    claim: mocks.claim,
  },
}));

const campaign = {
  key: "festival-dashain-2026",
  name: "Dashain 2026",
  kind: "FESTIVAL",
  complimentaryDays: 14,
  discountPercent: 10,
  startsAt: "2026-09-20T00:00:00.000Z",
  endsAt: "2026-10-05T00:00:00.000Z",
  emailSubject: "Celebrate with Orivraa",
  emailHeading: "A festival offer for your jewellery business",
  emailBody: "Claim complimentary Pro and save on every paid plan.",
};

describe("FestivalOfferPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.history.replaceState(
      null,
      "",
      "/offers/festival-dashain-2026#token=personal-token",
    );
    mocks.lookup.mockResolvedValue({
      data: {
        recipient: "al***@example.com",
        days: 14,
        status: "SENT",
        expiresAt: "2026-10-05T00:00:00.000Z",
        claimable: true,
        requiresEmailVerification: false,
        campaign,
      },
    });
    mocks.claim.mockResolvedValue({
      data: { claimed: true, alreadyClaimed: false, days: 14 },
    });
    mocks.refreshUser.mockResolvedValue(undefined);
  });

  it("shows both festival benefits and claims the personal Pro grant", async () => {
    render(<FestivalOfferPage />);

    expect(
      await screen.findByText("A festival offer for your jewellery business"),
    ).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View discounted plans" }),
    ).toHaveAttribute(
      "href",
      "/dashboard/shop/billing?tab=upgrade&offer=festival-dashain-2026",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Claim complimentary Pro" }),
    );

    await waitFor(() => {
      expect(mocks.claim).toHaveBeenCalledWith("personal-token");
      expect(
        screen.getByText("Your complimentary Pro offer is active."),
      ).toBeInTheDocument();
    });
  });
});
