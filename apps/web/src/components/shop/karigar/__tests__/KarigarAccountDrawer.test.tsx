import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  KarigarAccountDrawer,
  createIdempotencyKey,
} from "../KarigarAccountDrawer";
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

  it("uses getRandomValues when randomUUID is unavailable", () => {
    const cryptoApi = globalThis.crypto;
    const original = Object.getOwnPropertyDescriptor(cryptoApi, "randomUUID");
    Object.defineProperty(cryptoApi, "randomUUID", {
      configurable: true,
      value: undefined,
    });

    try {
      expect(createIdempotencyKey()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    } finally {
      if (original) {
        Object.defineProperty(cryptoApi, "randomUUID", original);
      } else {
        delete (cryptoApi as { randomUUID?: () => string }).randomUUID;
      }
    }
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
    expect(screen.getAllByText(/Wages Payable/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/12,500/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/35,000/i)).toBeInTheDocument();
    expect(screen.getByText(/22,500/i)).toBeInTheDocument();

    // Metal Float
    expect(screen.getAllByText("goldGrains24k").length).toBeGreaterThanOrEqual(
      1,
    );
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

  it("preserves idempotencyKey on unchanged retry after failure, but mints a new key on material edit", async () => {
    (karigarApi.recordPayment as any).mockRejectedValueOnce(
      new Error("Network glitch"),
    );

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

    // Open Pay Wages modal
    fireEvent.click(screen.getByRole("button", { name: /Pay Wages/i }));

    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "5000" } });

    // 1st attempt (fails)
    fireEvent.click(
      screen.getByRole("button", { name: /Confirm Settlement/i }),
    );

    await waitFor(() => {
      expect(karigarApi.recordPayment).toHaveBeenCalledTimes(1);
    });

    const firstCallKey = (karigarApi.recordPayment as any).mock.calls[0][1]
      .idempotencyKey;
    expect(firstCallKey).toBeDefined();

    // 2nd attempt: UNCHANGED RETRY (clicking submit again without changing inputs)
    (karigarApi.recordPayment as any).mockResolvedValueOnce({
      data: {
        entry: { id: "p1", amount: 5000 },
        summary: mockAccount.summary,
      },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Confirm Settlement/i }),
    );

    await waitFor(() => {
      expect(karigarApi.recordPayment).toHaveBeenCalledTimes(2);
    });

    const secondCallKey = (karigarApi.recordPayment as any).mock.calls[1][1]
      .idempotencyKey;
    // Unchanged retry must preserve the exact same idempotency key
    expect(secondCallKey).toBe(firstCallKey);
  });

  it("mints a new idempotencyKey when form values are edited after a failed attempt", async () => {
    (karigarApi.recordPayment as any).mockRejectedValueOnce(
      new Error("Network glitch"),
    );

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

    fireEvent.click(screen.getByRole("button", { name: /Pay Wages/i }));

    const amountInput = screen.getByPlaceholderText("0.00");
    fireEvent.change(amountInput, { target: { value: "5000" } });

    // 1st attempt (fails)
    fireEvent.click(
      screen.getByRole("button", { name: /Confirm Settlement/i }),
    );

    await waitFor(() => {
      expect(karigarApi.recordPayment).toHaveBeenCalledTimes(1);
    });

    const firstCallKey = (karigarApi.recordPayment as any).mock.calls[0][1]
      .idempotencyKey;

    // User edits amount to 6000 after failure
    fireEvent.change(amountInput, { target: { value: "6000" } });

    (karigarApi.recordPayment as any).mockResolvedValueOnce({
      data: {
        entry: { id: "p2", amount: 6000 },
        summary: mockAccount.summary,
      },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Confirm Settlement/i }),
    );

    await waitFor(() => {
      expect(karigarApi.recordPayment).toHaveBeenCalledTimes(2);
    });

    const secondCallKey = (karigarApi.recordPayment as any).mock.calls[1][1]
      .idempotencyKey;
    // Edited retry must rotate to a brand new idempotency key
    expect(secondCallKey).not.toBe(firstCallKey);
  });
});
