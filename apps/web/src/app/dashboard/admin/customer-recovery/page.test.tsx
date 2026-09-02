import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerRecoveryPage from "./page";

const t = (value: string) => value;

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
  useT: () => t,
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
  totalAccounts: 4,
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
      emailVerified: true,
      hasPaidPlan: false,
      hasShop: true,
      accountStatus: "ACTIVE",
      offerStatus: null,
    },
    {
      userId: "user-2",
      shopId: "shop-2",
      email: "paid@example.com",
      firstName: "Paid",
      shopName: "Paid Gold",
      country: "IN",
      lastActiveAt: "2026-08-01T00:00:00.000Z",
      activitySegment: "dormant",
      incidentAffected: false,
      timeZone: "Asia/Kolkata",
      recommendedSendAt: "2026-09-01T04:30:00.000Z",
      emailVerified: true,
      hasPaidPlan: true,
      hasShop: true,
      accountStatus: "ACTIVE",
      offerStatus: null,
    },
    {
      userId: "user-3",
      shopId: "shop-3",
      email: "pending@example.com",
      firstName: "Pending",
      shopName: "Pending Gold",
      country: "IN",
      lastActiveAt: null,
      activitySegment: "lapsed",
      incidentAffected: false,
      timeZone: "Asia/Kolkata",
      recommendedSendAt: "2026-09-01T04:30:00.000Z",
      emailVerified: true,
      hasPaidPlan: false,
      hasShop: true,
      accountStatus: "PENDING_VERIFICATION",
      offerStatus: "PREPARED",
    },
    {
      userId: "user-4",
      shopId: "",
      email: "noshop@example.com",
      firstName: "NoShop",
      shopName: "No shop yet",
      country: "IN",
      lastActiveAt: null,
      activitySegment: "lapsed",
      incidentAffected: false,
      timeZone: "Asia/Kolkata",
      recommendedSendAt: "2026-09-01T04:30:00.000Z",
      emailVerified: false,
      hasPaidPlan: false,
      hasShop: false,
      accountStatus: "PENDING_VERIFICATION",
      offerStatus: null,
    },
  ],
  excluded: [
    {
      userId: "user-5",
      email: "repeat@example.com",
      reason: "Recovery offer was already claimed",
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

async function renderLoadedPage() {
  render(<CustomerRecoveryPage />);
  expect(await screen.findByText("Owner Gold")).toBeInTheDocument();
}

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

  it("previews the branded 50-day campaign without auto-selecting accounts", async () => {
    await renderLoadedPage();

    expect(screen.getByText("50 days free")).toBeInTheDocument();
    expect(screen.getByText("Founder & CEO, Orivraa")).toBeInTheDocument();
    expect(screen.getByText("Invoice report linked")).toBeInTheDocument();
    expect(screen.getByText("Paid Gold")).toBeInTheDocument();
    expect(screen.getByText("Pending Gold")).toBeInTheDocument();
    expect(screen.getAllByText("No shop yet").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Already on Pro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Email not verified").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending verification").length).toBeGreaterThan(
      1,
    );
    expect(screen.getByText("Queued offer")).toBeInTheDocument();
    expect(screen.getByText("0 account(s) selected")).toBeInTheDocument();
    expect(screen.getByText("Recovery campaign funnel")).toBeInTheDocument();
    expect(screen.getAllByText("Rejoined")).toHaveLength(2);
    expect(screen.getByText("37.5% of sent")).toBeInTheDocument();
  });

  it("lets an admin select one email, then schedule the visible list", async () => {
    await renderLoadedPage();

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select Owner Gold",
      }),
    );
    expect(screen.getByText("1 account(s) selected")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Select all visible" }),
    );
    expect(screen.getByText("4 account(s) selected")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Schedule selected at local 10 AM" }),
    );

    await waitFor(() => {
      expect(mocks.sendAudience).toHaveBeenCalledWith({
        userIds: ["user-1", "user-2", "user-3", "user-4"],
        campaignKey: "customer-winback-2026-09",
        expiresInDays: 30,
        deliveryTiming: "NEXT_LOCAL_10AM",
        scheduledFor: undefined,
        recipientSchedules: undefined,
      });
    });
  });

  it("sends a custom campaign time and a per-email override", async () => {
    await renderLoadedPage();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Owner Gold" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Pending Gold" }),
    );
    fireEvent.click(screen.getByRole("radio", { name: "Custom date and time" }));
    fireEvent.change(screen.getByLabelText("Custom send time"), {
      target: { value: "2026-09-05T10:00" },
    });
    fireEvent.change(screen.getByLabelText("Send time for pending@example.com"), {
      target: { value: "2026-09-06T14:30" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Schedule selected at custom time" }),
    );

    await waitFor(() => {
      expect(mocks.sendAudience).toHaveBeenCalledWith({
        userIds: ["user-1", "user-3"],
        campaignKey: "customer-winback-2026-09",
        expiresInDays: 30,
        deliveryTiming: "CUSTOM",
        scheduledFor: new Date("2026-09-05T10:00").toISOString(),
        recipientSchedules: [
          {
            userId: "user-3",
            scheduledAt: new Date("2026-09-06T14:30").toISOString(),
          },
        ],
      });
    });
  });
});
