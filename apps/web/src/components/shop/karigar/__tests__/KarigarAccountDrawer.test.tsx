import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KarigarAccountDrawer } from "../KarigarAccountDrawer";
import { karigarApi } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  karigarApi: {
    getAccount: vi.fn(),
    getStatement: vi.fn(),
    recordPayment: vi.fn(),
    recordAdvance: vi.fn(),
    recordAdjustment: vi.fn(),
    recordMetalReturn: vi.fn(),
  },
}));

vi.mock("@/providers/translation-provider", () => ({
  useT: () => (s: string) => s,
  useTranslation: () => ({
    t: (s: string) => s,
    locale: "en",
    register: () => {},
    loading: false,
    hasTranslation: () => true,
  }),
}));

describe("KarigarAccountDrawer", () => {
  const mockAccount = {
    workshop: {
      id: "ws-1",
      name: "Kathmandu Filigree Works",
      artisan: "Bikash Shakya",
      location: "Patan",
      phone: "9841000000",
      rating: 4.9,
      wageRatePerGram: 250,
      wastageLimit: 1.5,
    },
    currency: "NPR",
    summary: {
      amountPayable: 12500,
      advanceBalance: 0,
      netPayable: 12500,
      totalWagesAccrued: 35000,
      totalSettlementsPaid: 22500,
      totalAdvances: 0,
    },
    openJobs: [],
    overdueJobs: 0,
    cancelledJobs: 0,
    metalBalances: [
      {
        metalKey: "goldGrains24k",
        issuedGrams: 50,
        returnedGrams: 30,
        outstandingGrams: 20,
      },
    ],
  };

  const mockStatement = {
    totalCount: 2,
    items: [
      {
        id: "entry-1",
        kind: "MONEY",
        eventType: "WAGE_ACCRUAL",
        createdAt: new Date().toISOString(),
        jobProduct: "Filigree Bridal Necklace",
        amount: 12500,
        currency: "NPR",
        note: "Wage accrued for finished return of 50g",
      },
      {
        id: "mov-1",
        kind: "METAL",
        eventType: "RETURN_FINISHED",
        createdAt: new Date().toISOString(),
        metalKey: "goldGrains24k",
        quantity: 50,
        note: "Finished necklace",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (karigarApi.getAccount as any).mockResolvedValue({ data: mockAccount });
    (karigarApi.getStatement as any).mockResolvedValue({ data: mockStatement });
  });

  it("renders workshop account summary, KPI banner, and statement feed", async () => {
    render(
      <KarigarAccountDrawer
        workshopId="ws-1"
        shopCurrency="NPR"
        onClose={vi.fn()}
      />,
    );

    // Workshop Name & Artisan
    await waitFor(() => {
      expect(screen.getByText("Kathmandu Filigree Works")).toBeInTheDocument();
      expect(screen.getByText(/Bikash Shakya/)).toBeInTheDocument();
    });

    // KPI values
    expect(screen.getAllByText(/Wages Payable/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/12,500/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/35,000/i)).toBeInTheDocument();
    expect(screen.getByText(/22,500/i)).toBeInTheDocument();

    // Metal Float
    expect(screen.getAllByText("goldGrains24k").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/20.000g/i)).toBeInTheDocument();

    // Statement item
    expect(screen.getByText("Filigree Bridal Necklace")).toBeInTheDocument();
  });

  it("opens Pay Wages modal when Pay Wages button is clicked", async () => {
    render(
      <KarigarAccountDrawer
        workshopId="ws-1"
        shopCurrency="NPR"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Kathmandu Filigree Works")).toBeInTheDocument();
    });

    const payButton = screen.getByRole("button", { name: /Pay Wages/i });
    expect(payButton).not.toBeDisabled();
    fireEvent.click(payButton);

    expect(screen.getByText(/Pay Accrued Wages/i)).toBeInTheDocument();
  });

  it("opens Record Advance modal when Record Advance button is clicked", async () => {
    render(
      <KarigarAccountDrawer
        workshopId="ws-1"
        shopCurrency="NPR"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Kathmandu Filigree Works")).toBeInTheDocument();
    });

    const advButton = screen.getByRole("button", { name: /Record Advance/i });
    fireEvent.click(advButton);

    expect(screen.getByText(/Record Advance Payment/i)).toBeInTheDocument();
  });

  it("opens Return Metal modal when Return Metal button is clicked", async () => {
    render(
      <KarigarAccountDrawer
        workshopId="ws-1"
        shopCurrency="NPR"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Kathmandu Filigree Works")).toBeInTheDocument();
    });

    const retButton = screen.getByRole("button", { name: /Return Metal/i });
    fireEvent.click(retButton);

    expect(screen.getByText(/Reconcile \/ Return Metal/i)).toBeInTheDocument();
  });
});
