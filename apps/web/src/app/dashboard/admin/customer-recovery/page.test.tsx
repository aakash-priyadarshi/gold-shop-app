import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OffersAdminPage from "../offers/page";

const t = (value: string) => value;

const mocks = vi.hoisted(() => ({
  previewAudience: vi.fn(),
  metrics: vi.fn(),
  recent: vi.fn(),
  sendAudience: vi.fn(),
  listCampaigns: vi.fn(),
  festivalCalendar: vi.fn(),
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
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
    listCampaigns: mocks.listCampaigns,
    festivalCalendar: mocks.festivalCalendar,
    createCampaign: mocks.createCampaign,
    updateCampaign: mocks.updateCampaign,
  },
}));

const preview = {
  campaignKey: "customer-winback-2026-09",
  days: 50,
  nearbyScheduled: 0,
  campaign: {
    key: "customer-winback-2026-09",
    name: "Customer win-back",
    kind: "RECOVERY",
    complimentaryDays: 50,
    discountPercent: 0,
    startsAt: null,
    endsAt: null,
    emailSubject: "Recovery",
    emailHeading: "We’re sorry about the invoice issue.",
    emailBody:
      "We fixed the issue, strengthened monitoring, and improved invoice reliability.",
  },
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
      sentAt: null,
      deliveredAt: null,
      firstOpenedAt: null,
      claimedAt: null,
      openCount: 0,
      clickCount: 0,
      unsubscribed: false,
      canSend: true,
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
      sentAt: null,
      deliveredAt: null,
      firstOpenedAt: null,
      claimedAt: null,
      openCount: 0,
      clickCount: 0,
      unsubscribed: false,
      canSend: true,
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
      sentAt: null,
      deliveredAt: null,
      firstOpenedAt: null,
      claimedAt: null,
      openCount: 0,
      clickCount: 0,
      unsubscribed: false,
      canSend: false,
      cannotSendReason: "Offer email is already queued or scheduled",
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
      sentAt: null,
      deliveredAt: null,
      firstOpenedAt: null,
      claimedAt: null,
      openCount: 0,
      clickCount: 0,
      unsubscribed: false,
      canSend: true,
    },
    {
      userId: "user-6",
      shopId: "shop-6",
      email: "usa@example.com",
      firstName: "Usa",
      shopName: "USA Gold",
      country: "US",
      lastActiveAt: "2026-07-01T00:00:00.000Z",
      activitySegment: "lapsed",
      incidentAffected: false,
      timeZone: "America/New_York",
      recommendedSendAt: "2026-09-01T14:00:00.000Z",
      emailVerified: true,
      hasPaidPlan: false,
      hasShop: true,
      accountStatus: "ACTIVE",
      offerStatus: null,
      sentAt: null,
      deliveredAt: null,
      firstOpenedAt: null,
      claimedAt: null,
      openCount: 0,
      clickCount: 0,
      unsubscribed: false,
      canSend: true,
    },
    {
      userId: "user-5",
      shopId: "shop-5",
      email: "repeat@example.com",
      firstName: "Repeat",
      shopName: "Repeat Gold",
      country: "IN",
      lastActiveAt: "2026-07-01T00:00:00.000Z",
      activitySegment: "lapsed",
      incidentAffected: false,
      timeZone: "Asia/Kolkata",
      recommendedSendAt: "2026-09-01T04:30:00.000Z",
      emailVerified: true,
      hasPaidPlan: false,
      hasShop: true,
      accountStatus: "ACTIVE",
      offerStatus: "CLAIMED",
      sentAt: "2026-08-20T00:00:00.000Z",
      deliveredAt: "2026-08-20T00:01:00.000Z",
      firstOpenedAt: "2026-08-20T08:00:00.000Z",
      claimedAt: "2026-08-21T00:00:00.000Z",
      openCount: 2,
      clickCount: 1,
      unsubscribed: false,
      canSend: false,
      cannotSendReason: "Offer was already claimed",
    },
  ],
  excluded: [],
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
    unsubscribed: 1,
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

function dateKey(date: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const calendarFestivalDate = (() => {
  const today = new Date();
  const lastDay = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();
  return new Date(
    today.getFullYear(),
    today.getMonth(),
    Math.min(today.getDate() + 1, lastDay),
  );
})();

const festivalCalendar = {
  startYear: calendarFestivalDate.getFullYear(),
  endYear: calendarFestivalDate.getFullYear() + 2,
  generatedAt: new Date().toISOString(),
  events: [
    {
      id: `hindu-diwali-${dateKey(calendarFestivalDate)}`,
      name: "Diwali",
      religion: "HINDU",
      date: dateKey(calendarFestivalDate),
      countries: ["IN"],
      dateAccuracy: "CALCULATED",
      source: "PANCHANGAM",
    },
  ],
  notices: ["Islamic dates may move by one day."],
};

async function renderLoadedPage() {
  render(<OffersAdminPage />);
  expect(await screen.findByText("Owner Gold")).toBeInTheDocument();
}

describe("OffersAdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.previewAudience.mockResolvedValue({ data: preview });
    mocks.metrics.mockResolvedValue({ data: metrics });
    mocks.recent.mockResolvedValue({ data: [] });
    mocks.sendAudience.mockResolvedValue({
      data: { queued: 0, scheduled: 1, failed: 0, excluded: [] },
    });
    mocks.listCampaigns.mockResolvedValue({ data: [] });
    mocks.festivalCalendar.mockResolvedValue({ data: festivalCalendar });
    mocks.createCampaign.mockResolvedValue({
      data: {
        key: `festival-diwali-${calendarFestivalDate.getFullYear()}`,
      },
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
    expect(screen.getAllByText("Scheduled").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Activated").length).toBeGreaterThan(0);
    expect(screen.getByText("Repeat Gold")).toBeInTheDocument();
    expect(screen.getByText("0 account(s) selected")).toBeInTheDocument();
    expect(screen.getByText("Offer campaign funnel")).toBeInTheDocument();
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
      screen.getByRole("button", { name: "Select all sendable" }),
    );
    expect(screen.getByText("4 account(s) selected")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Schedule selected at local 10 AM" }),
    );

    await waitFor(() => {
      expect(mocks.sendAudience).toHaveBeenCalledWith({
        userIds: ["user-1", "user-2", "user-4", "user-6"],
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
      screen.getByRole("checkbox", { name: "Select No shop yet" }),
    );
    fireEvent.click(screen.getByRole("radio", { name: "Custom date and time" }));
    fireEvent.change(screen.getByLabelText("Custom send time"), {
      target: { value: "2026-09-05T10:00" },
    });
    fireEvent.change(screen.getByLabelText("Send time for noshop@example.com"), {
      target: { value: "2026-09-06T14:30" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Schedule selected at custom time" }),
    );

    await waitFor(() => {
      expect(mocks.sendAudience).toHaveBeenCalledWith({
        userIds: ["user-1", "user-4"],
        campaignKey: "customer-winback-2026-09",
        expiresInDays: 30,
        deliveryTiming: "CUSTOM",
        scheduledFor: new Date("2026-09-05T10:00").toISOString(),
        recipientSchedules: [
          {
            userId: "user-4",
            scheduledAt: new Date("2026-09-06T14:30").toISOString(),
          },
        ],
      });
    });
  });

  it("shows already-sent tracking and keeps those checkboxes disabled", async () => {
    await renderLoadedPage();

    const claimedCheckbox = screen.getByRole("checkbox", {
      name: "Select Repeat Gold",
    });
    const scheduledCheckbox = screen.getByRole("checkbox", {
      name: "Select Pending Gold",
    });
    expect(claimedCheckbox).toBeDisabled();
    expect(scheduledCheckbox).toBeDisabled();
    fireEvent.click(claimedCheckbox);
    expect(screen.getByText("0 account(s) selected")).toBeInTheDocument();
    expect(screen.getByText(/2 opens/)).toBeInTheDocument();
  });

  it("does not email selected accounts hidden by the current filter", async () => {
    await renderLoadedPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Select all sendable" }),
    );
    fireEvent.change(screen.getByLabelText("Audience country"), {
      target: { value: "US" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Schedule selected at local 10 AM" }),
    );

    await waitFor(() => {
      expect(mocks.sendAudience).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: ["user-6"],
        }),
      );
    });
  });

  it("rejects a festival window that ends before it starts", async () => {
    await renderLoadedPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Create festival offer" }),
    );
    fireEvent.change(screen.getByLabelText("Sale starts"), {
      target: { value: "2026-10-05T10:00" },
    });
    fireEvent.change(screen.getByLabelText("Sale ends"), {
      target: { value: "2026-10-01T10:00" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save festival campaign" }),
    );

    expect(mocks.createCampaign).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "The sale must end after it starts",
      }),
    );
  });

  it("prefills an editable campaign from a calendar festival", async () => {
    await renderLoadedPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Create Diwali offer" }),
    );

    expect(screen.getByLabelText("Campaign name")).toHaveValue(
      `Diwali ${calendarFestivalDate.getFullYear()}`,
    );
    expect(screen.getByLabelText("Campaign key")).toHaveValue(
      `festival-diwali-${calendarFestivalDate.getFullYear()}`,
    );
    expect(screen.getByLabelText("Complimentary Pro days")).toHaveValue(14);
    expect(screen.getByLabelText("Plan discount percent")).toHaveValue(10);

    fireEvent.change(screen.getByLabelText("Complimentary Pro days"), {
      target: { value: "21" },
    });
    fireEvent.change(screen.getByLabelText("Plan discount percent"), {
      target: { value: "15" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save festival campaign" }),
    );

    await waitFor(() => {
      expect(mocks.createCampaign).toHaveBeenCalledWith(
        expect.objectContaining({
          key: `festival-diwali-${calendarFestivalDate.getFullYear()}`,
          name: `Diwali ${calendarFestivalDate.getFullYear()}`,
          complimentaryDays: 21,
          discountPercent: 15,
          kind: "FESTIVAL",
        }),
      );
    });
  });
});
