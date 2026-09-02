import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PricingPage from "./page";

const mocks = vi.hoisted(() => ({
  getAvailable: vi.fn(),
}));

vi.mock("@/components/layout/header", () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock("@/components/layout/DynamicFooter", () => ({
  DynamicFooter: () => <div data-testid="footer" />,
}));

vi.mock("@/components/marketing/ComparisonClusterLinks", () => ({
  ComparisonClusterLinks: () => null,
}));

vi.mock("@/components/marketing/AskAiAboutUs", () => ({
  AiDiscoverySection: () => null,
}));

vi.mock("@/components/marketing/TrustSignals", () => ({
  TrustSignals: () => null,
}));

vi.mock("@/components/ui/T", () => ({
  T: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/usePlatformFeatures", () => ({
  usePlatformFeatures: () => ({
    features: { customerFlowEnabled: false },
  }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "unauthenticated" }),
}));

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn() },
  subscriptionPlansApi: {
    getAvailable: mocks.getAvailable,
  },
}));

function usd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

const PLANS = [
  {
    id: "free",
    name: "FREE",
    displayName: "Free",
    description: "Start listing products",
    country: "US",
    currency: "USD",
    monthlyPrice: 0,
    annualPrice: 0,
    maxProducts: 10,
    maxInvoicesPerMonth: 10,
    maxCatalogues: 1,
    catalogueLimit: 1,
    maxOrdersPerMonth: 10,
    commissionPercent: 5,
    includesAi: false,
    monthlyAiCredits: 0,
    rolloverCap: 0,
    extraCreditPrice: 0,
    overageBehavior: "block",
    features: {},
    sortOrder: 0,
  },
  {
    id: "pro",
    name: "PRO",
    displayName: "Pro",
    description: "Full jewellery CRM",
    country: "US",
    currency: "USD",
    monthlyPrice: 299,
    annualPrice: 2988,
    maxProducts: 100,
    maxInvoicesPerMonth: 200,
    maxCatalogues: 5,
    catalogueLimit: 5,
    maxOrdersPerMonth: 200,
    commissionPercent: 3,
    includesAi: false,
    monthlyAiCredits: 0,
    rolloverCap: 0,
    extraCreditPrice: 1,
    overageBehavior: "block",
    features: {},
    sortOrder: 1,
  },
  {
    id: "pro-plus",
    name: "PRO_PLUS",
    displayName: "Pro+",
    description: "CRM plus AI tools",
    country: "US",
    currency: "USD",
    monthlyPrice: 599,
    annualPrice: 5988,
    maxProducts: 500,
    maxInvoicesPerMonth: 1000,
    maxCatalogues: 20,
    catalogueLimit: 20,
    maxOrdersPerMonth: 1000,
    commissionPercent: 2,
    includesAi: true,
    monthlyAiCredits: 100,
    rolloverCap: 200,
    extraCreditPrice: 1,
    overageBehavior: "block",
    features: {},
    sortOrder: 2,
  },
  {
    id: "enterprise",
    name: "ENTERPRISE",
    displayName: "Enterprise",
    description: "Multi-branch operations",
    country: "US",
    currency: "USD",
    monthlyPrice: 0,
    annualPrice: 0,
    maxProducts: null,
    maxInvoicesPerMonth: null,
    maxCatalogues: null,
    catalogueLimit: null,
    maxOrdersPerMonth: null,
    commissionPercent: 1,
    includesAi: true,
    monthlyAiCredits: 500,
    rolloverCap: 1000,
    extraCreditPrice: 1,
    overageBehavior: "allow",
    features: {},
    sortOrder: 3,
  },
];

function classTokens(el: HTMLElement): string[] {
  return el.className.split(/\s+/);
}

function planCtas() {
  return {
    startFree: screen.getByRole("link", { name: /^Start Free$/i }),
    getPro: screen.getByRole("link", { name: /^Get Pro$/i }),
    getProPlus: screen.getByRole("link", { name: /^Get Pro\+$/ }),
    contactSales: screen.getByRole("link", { name: /^Contact Sales$/ }),
  };
}

describe("PricingPage billing selector", () => {
  beforeEach(() => {
    mocks.getAvailable.mockReset();
    mocks.getAvailable.mockResolvedValue({ data: PLANS });
  });

  it("updates plan prices, annual billing copy, and selected styling when billing changes", async () => {
    render(<PricingPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Monthly/i })).toBeInTheDocument();
    });

    const monthly = screen.getByRole("button", { name: /Monthly/i });
    const annual = screen.getByRole("button", { name: /Annual/i });

    expect(monthly).toBeEnabled();
    expect(annual).toBeEnabled();
    expect(classTokens(monthly)).toContain("text-white");
    expect(classTokens(annual)).not.toContain("text-white");
    expect(classTokens(annual)).toContain("text-gray-600");

    await waitFor(() => {
      expect(screen.getAllByText(usd(299)).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(usd(599)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/billed annually/i)).not.toBeInTheDocument();

    const monthlyCtas = planCtas();
    expect(monthlyCtas.startFree).toHaveAttribute("href", "/auth/register");
    expect(monthlyCtas.getPro).toHaveAttribute("href", "/auth/register");
    expect(monthlyCtas.getProPlus).toHaveAttribute("href", "/auth/register");
    expect(monthlyCtas.contactSales).toHaveAttribute(
      "href",
      "/contact?interest=Enterprise+%2F+Multi-branch",
    );
    for (const link of Object.values(monthlyCtas)) {
      expect(link).not.toHaveAttribute("aria-disabled", "true");
      expect(link.querySelector("button")).not.toBeDisabled();
    }

    fireEvent.click(annual);

    await waitFor(() => {
      expect(classTokens(annual)).toContain("text-white");
    });
    expect(classTokens(monthly)).not.toContain("text-white");
    expect(classTokens(monthly)).toContain("text-gray-600");

    expect(screen.getAllByText(usd(2988 / 12)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(usd(5988 / 12)).length).toBeGreaterThan(0);
    expect(screen.getByText(usd(2988))).toBeInTheDocument();
    expect(screen.getByText(usd(5988))).toBeInTheDocument();
    expect(screen.getAllByText(/^billed annually$/i)).toHaveLength(2);
    expect(screen.getByText(/\(billed annually\)/i)).toBeInTheDocument();

    const annualCtas = planCtas();
    for (const link of Object.values(annualCtas)) {
      expect(link.querySelector("button")).not.toBeDisabled();
    }
    expect(annualCtas.getPro).toHaveAttribute("href", "/auth/register");
    expect(annualCtas.contactSales).toHaveAttribute(
      "href",
      "/contact?interest=Enterprise+%2F+Multi-branch",
    );
  });
});
