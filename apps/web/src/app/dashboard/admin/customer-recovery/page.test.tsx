import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerRecoveryPage from "./page";

const mocks = vi.hoisted(() => ({
  previewAudience: vi.fn(),
  metrics: vi.fn(),
  recent: vi.fn(),
  sendAudience: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/components/auth/RouteGuard", () => ({
  AdminGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/dashboard/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/ui/T", () => ({
  T: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/providers/translation-provider", () => ({
  useT: () => (value: string) => value,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/lib/api", () => ({
  recoveryOffersApi: {
    previewAudience: mocks.previewAudience,
    metrics: mocks.metrics,
    recent: mocks.recent,
    sendAudience: mocks.sendAudience,
  },
}));

const preview = {
  campaignKey: "customer-winback-2026-09",
  days: 50,
  totalAccounts: 2,
  eligible: [
    {
      userId: "user-1",
      shopId: "shop-1",
      email: "owner@example.com",
      firstName: "Owner",
      shopName: "Owner Gold",
      country: "IN",
      lastActiveAt: "2026-07-01T00:00:00.000Z",
      activitySegment: "lapsed",
      incidentAffected: true,
      timeZone: "Asia/Kolkata",
      recommendedSendAt: "2026-09-01T04:30:00.000Z",
    },
  ],
  excluded: [
    {
      userId: "user-2",
      email: "paid@example.com",
      reason: "Account already has an active paid plan",
    },
  ],
};

const metrics = {
  campaignKey: "customer-winback-2026-09",
  totals: {
    targeted: 10,
    scheduled: 0,
    sent: 8,
    delivered: 7,
    opened: 5,
    totalOpens: 8,
    clicked: 3,
    totalClicks: 4,
    claimed: 2,
    rejoined: 3,
    bounced: 1,
    complained: 0,
    failed: 0,
  },
  rates: {
    delivery: 87.5,
    open: 71.4,
    click: 42.9,
    claim: 28.6,
    rejoin: 37.5,
  },
  byCountry: [
    {
      country: "IN",
      targeted: 10,
      sent: 8,
      delivered: 7,
      opened: 5,
      clicked: 3,
      claimed: 2,
      rejoined: 3,
    },
  ],
  webhookConfigured: true,
  resendApiConfigured: true,
  updatedAt: "2026-09-01T12:00:00.000Z",
};

describe("CustomerRecoveryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.previewAudience.mockResolvedValue({ data: preview });
    mocks.metrics.mockResolvedValue({ data: metrics });
    mocks.recent.mockResolvedValue({ data: [] });
    mocks.sendAudience.mockResolvedValue({
      data: { queued: 0, scheduled: 1, failed: 0, excluded: [] },
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("previews the branded 50-day campaign and selects eligible accounts", async () => {
    render(<CustomerRecoveryPage />);

    await waitFor(() => {
      expect(screen.getByText("Owner Gold")).toBeInTheDocument();
    });
    expect(screen.getByText("50 days free")).toBeInTheDocument();
    expect(screen.getByText("Founder & CEO, Orivraa")).toBeInTheDocument();
    expect(screen.getByText("Invoice report linked")).toBeInTheDocument();
    expect(screen.getByText("1 account(s) selected")).toBeInTheDocument();
    expect(screen.getByText("Recovery campaign funnel")).toBeInTheDocument();
    expect(screen.getAllByText("Rejoined")).toHaveLength(2);
    expect(screen.getByText("37.5% of sent")).toBeInTheDocument();
  });

  it("schedules the selected account using country-local timing", async () => {
    render(<CustomerRecoveryPage />);

    const scheduleButton = await screen.findByRole("button", {
      name: "Schedule selected at local 10 AM",
    });
    fireEvent.click(scheduleButton);

    await waitFor(() => {
      expect(mocks.sendAudience).toHaveBeenCalledWith({
        userIds: ["user-1"],
        campaignKey: "customer-winback-2026-09",
        expiresInDays: 30,
        deliveryTiming: "NEXT_LOCAL_10AM",
      });
    });
  });
});
