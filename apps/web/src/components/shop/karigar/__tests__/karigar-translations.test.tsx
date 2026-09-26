import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { karigarApi } from "@/lib/api";
import { KarigarJobGoldCard } from "../KarigarJobGoldCard";
import { KarigarAccountDrawer } from "../KarigarAccountDrawer";
import { KarigarStatementPrint } from "../KarigarStatementPrint";
import { JobCostSummaryModal } from "../JobCostSummaryModal";
import SupplyChainPage from "@/app/dashboard/shop/supply-chain/page";

const translation = vi.hoisted(() => ({
  ready: true,
  t: vi.fn<(text: string) => string>(),
  register: vi.fn(),
}));
const route = vi.hoisted(() => ({
  user: { shop: { workshopMode: true } },
  view: "book",
  enabled: true,
  error: null as string | null,
  setSubKey: vi.fn(),
}));

// Keep the real <T> so mount, registration, and later dictionary updates are exercised.
vi.mock("@/providers/translation-provider", () => ({
  useT: () => translation.t,
  useTranslation: () => ({ locale: "ne", t: translation.t, register: translation.register }),
}));
vi.mock("@/hooks/useMarket", () => ({ useMarket: () => ({ selectedCurrency: "NPR" }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: route.user }) }));
vi.mock("@/hooks/useFeatures", () => ({ useFeatures: () => ({
  hasFeature: () => route.enabled, planName: "PRO", loading: false, status: "ready", error: route.error,
}) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams({ view: route.view }) }));
vi.mock("@/components/auth/RouteGuard", () => ({ ShopGuard: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ DashboardLayout: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock("@/components/FeatureGate", () => ({ FeatureGate: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock("@/components/tutorial/useTourContext", () => ({ useTourContext: () => route.setSubKey }));
vi.mock("@/components/shop/workshop/overview/WorkshopOverview", () => ({ WorkshopOverview: () => null }));
vi.mock("@/components/shop/workshop/jobs/WorkshopJobsModule", () => ({ WorkshopJobsModule: () => null }));
vi.mock("@/components/shop/workshop/jobs/WorkshopJobDetailView", () => ({ WorkshopJobDetailView: () => null }));
vi.mock("@/components/shop/workshop/production/WorkshopProductionFloor", () => ({ WorkshopProductionFloor: () => null }));
vi.mock("@/components/shop/workshop/metal/WorkshopMetalModule", () => ({ WorkshopMetalModule: () => null }));
vi.mock("@/components/shop/workshop/transfers/WorkshopTransfersModule", () => ({ WorkshopTransfersModule: () => null }));
vi.mock("@/components/shop/workshop/recovery/WorkshopRecoveryModule", () => ({ WorkshopRecoveryModule: () => null }));
vi.mock("@/components/shop/workshop/qc/WorkshopQcModule", () => ({ WorkshopQcModule: () => null }));
vi.mock("@/components/shop/workshop/reports/WorkshopReportsModule", () => ({ WorkshopReportsModule: () => null }));
vi.mock("@/components/shop/workshop/settings/WorkshopSettingsModule", () => ({ WorkshopSettingsModule: () => null }));
vi.mock("@/components/shop/workshop/WorkshopJobCardView", () => ({ WorkshopJobCardView: () => null }));
vi.mock("@/lib/api", () => ({
  materialsApi: { getMarketRates: vi.fn() },
  karigarApi: {
    getAccount: vi.fn(), getStatement: vi.fn(), getJobCostSummary: vi.fn(),
    recordPayment: vi.fn(), updateStage: vi.fn(), updateTree: vi.fn(),
    getSnapshot: vi.fn(), addMovement: vi.fn(),
  },
}));

const workshop = {
  id: "ws-123", name: "Workshop name", artisan: "Artisan name",
  location: "Patan", wageRatePerGram: 250, wastageLimit: 1,
};
const summary = {
  amountPayable: 12500, advanceBalance: 0, netPayable: 12500,
  totalWagesAccrued: 12500, totalSettlementsPaid: 0, totalAdvances: 0,
};
const items = [{
  id: "entry-123", kind: "MONEY" as const, eventType: "SETTLEMENT_PAYMENT",
  createdAt: "2026-09-01T10:00:00Z", jobProduct: "Bridal necklace SKU-123",
  paymentMethod: "BANK_TRANSFER", reference: "TXN-123", note: "Customer note",
  amount: 500, currency: "NPR",
}];
const job = {
  id: "job-123", product: "Bridal necklace SKU-123", artisan: "Artisan name", status: "PENDING",
  stages: [{ id: "stage-123", stage: "CASTING" as const, goldInGrams: 12,
    goldOutGrams: 10, scrapGrams: 1, dustGrams: 0.5, allowedWastagePercent: 1, status: "DONE" }],
  trees: [{ id: "tree-123", label: "Custom tree name", issuedGrams: 12, finishedGrams: 10,
    sprueButtonGrams: 1, recoverableGrams: 0.5, allowedWastagePercent: 1 }],
};
const cost = {
  product: job.product, artisan: job.artisan, status: "PENDING", currency: "NPR",
  wageAccrued: 12500, wageOutstanding: 12000, advanceAllocated: 0, settlementAllocated: 500,
  metalBalances: [], accruals: [], allocations: [{
    id: "allocation-123", financialEntryType: "SETTLEMENT_PAYMENT", paymentMethod: "BANK_TRANSFER",
    reference: "TXN-123", amount: 500, createdAt: items[0].createdAt,
  }],
};

beforeEach(() => {
  vi.clearAllMocks();
  translation.ready = true;
  route.view = "book";
  route.enabled = true;
  route.error = null;
  translation.t.mockImplementation((text) => translation.ready ? `[ne] ${text}` : text);
  vi.mocked(karigarApi.getAccount).mockResolvedValue({ data: { workshop, summary, openJobs: 1, metalBalances: [] } } as never);
  vi.mocked(karigarApi.getStatement).mockResolvedValue({ data: { items } } as never);
  vi.mocked(karigarApi.getJobCostSummary).mockResolvedValue({ data: cost } as never);
  vi.mocked(karigarApi.recordPayment).mockResolvedValue({ data: {} } as never);
  vi.mocked(karigarApi.updateStage).mockResolvedValue({ data: {} } as never);
  vi.mocked(karigarApi.getSnapshot).mockResolvedValue({ data: {
    workshops: [], jobs: [], customMaterials: [{ key: "CUSTOM_ROSE", label: "Family rose gold mix", vaultKey: "custom_rose" }],
  } } as never);
  vi.mocked(karigarApi.addMovement).mockResolvedValue({ data: {} } as never);
});
afterEach(cleanup);

function expectUserDataUntranslated() {
  for (const value of [workshop.name, workshop.artisan, workshop.location, job.product,
    "Custom tree name", "TXN-123", "Customer note", "goldGrains24k"]) {
    expect(translation.t).not.toHaveBeenCalledWith(value);
    expect(translation.register).not.toHaveBeenCalledWith(value);
  }
}

describe("Karigar translation coverage", () => {
  it("translates navigation and form placeholders while preserving custom material names and issue values", async () => {
    render(<SupplyChainPage />);
    expect(await screen.findByText("Family rose gold mix")).toBeInTheDocument();
    for (const label of ["Karigar Book", "Overview", "Jobs", "Production", "Metal", "Transfers", "Recovery", "QC", "Reports", "Factory Settings"]) {
      expect(screen.getByRole("link", { name: `[ne] ${label}` })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "[ne] Factory Settings" })).toHaveAttribute("href", "/dashboard/shop/supply-chain?view=settings");
    fireEvent.click(screen.getByRole("button", { name: "[ne] Procure Bullion" }));
    expect(screen.getByText("[ne] Gold Grains (24K)")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("[ne] e.g. 100"), { target: { value: "123.5" } });
    fireEvent.click(screen.getByRole("button", { name: "[ne] Add to Vault" }));
    await waitFor(() => expect(karigarApi.addMovement).toHaveBeenCalledWith({
      type: "ADJUST", weightGrams: 123.5, metalKey: "goldGrains24k", note: "Procure",
    }));
    expect(await screen.findByText("[ne] Procured 123.5g [ne] into vault reserves!")).toBeInTheDocument();
    expect(translation.t).not.toHaveBeenCalledWith("Family rose gold mix");
    expect(translation.register).not.toHaveBeenCalledWith("Family rose gold mix");
  });

  it("translates the workshop access error on the Supply Chain route", async () => {
    route.view = "overview";
    route.enabled = false;
    route.error = "Could not load subscription details";
    render(<SupplyChainPage />);
    expect(await screen.findByText("[ne] Could not load subscription details")).toBeInTheDocument();
  });

  it("translates job status, stage fields and casting labels without changing stage payloads", async () => {
    render(<KarigarJobGoldCard job={job} onChanged={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(await screen.findByText("[ne] PENDING")).toBeInTheDocument();
    expect(screen.getByText("[ne] Casting")).toBeInTheDocument();
    expect(screen.getByText(job.product)).toBeInTheDocument();
    expect(screen.getByText("Custom tree name")).toBeInTheDocument();
    expect(screen.getByLabelText("[ne] Issued g")).toHaveValue("12");
    const output = screen.getByLabelText("[ne] Casting: [ne] out (g)");
    expect(output).toHaveAttribute("placeholder", "[ne] out");
    fireEvent.change(output, { target: { value: "9.5" } });
    fireEvent.click(screen.getAllByRole("button", { name: "[ne] Save stage" })[0]);
    await waitFor(() => expect(karigarApi.updateStage).toHaveBeenCalledWith("job-123", "CASTING", {
      goldInGrams: 12, goldOutGrams: 9.5, scrapGrams: 1, dustGrams: 0.5,
      allowedWastagePercent: 1, status: "DONE",
    }));
    expectUserDataUntranslated();
  });

  it("translates statement events, payment labels and notices while preserving settlement values", async () => {
    render(<KarigarAccountDrawer workshopId={workshop.id} onClose={vi.fn()} />);
    expect(await screen.findByText("[ne] SETTLEMENT PAYMENT")).toBeInTheDocument();
    expect(screen.getByText(/\[ne\] BANK TRANSFER/)).toBeInTheDocument();
    expect(screen.getByText(job.product)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "[ne] Close" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "[ne] Pay Wages" }));
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "500" } });
    fireEvent.change(screen.getByPlaceholderText("[ne] e.g. CHQ-99823 or TXN-4411"), { target: { value: "TXN-123" } });
    fireEvent.click(screen.getByRole("button", { name: "[ne] Confirm Settlement" }));
    expect(await screen.findByText("[ne] Settlement payment recorded successfully")).toBeInTheDocument();
    expect(karigarApi.recordPayment).toHaveBeenCalledWith("ws-123", expect.objectContaining({
      amount: 500, paymentMethod: "CASH", reference: "TXN-123",
    }));
    expectUserDataUntranslated();
  });

  it("updates an API error when its translation arrives without refetching the account", async () => {
    translation.ready = false;
    vi.mocked(karigarApi.getAccount).mockRejectedValueOnce({ response: { data: { message: "Account temporarily unavailable" } } });
    const view = <KarigarAccountDrawer workshopId={workshop.id} onClose={vi.fn()} />;
    const { rerender } = render(view);
    expect(await screen.findByText("Account temporarily unavailable")).toBeInTheDocument();
    translation.ready = true;
    rerender(React.cloneElement(view));
    expect(await screen.findByText("[ne] Account temporarily unavailable")).toBeInTheDocument();
    expect(karigarApi.getAccount).toHaveBeenCalledTimes(1);
  });

  it("exports translated CSV headings and enum labels with safe quoting and unchanged user data", async () => {
    translation.t.mockImplementation((text) => text === "Date" ? "Date, translated" : `[ne] ${text}`);
    const createObjectURL = vi.fn<(blob: Blob | MediaSource) => string>(() => "blob:statement");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const originalURL = URL;
    vi.stubGlobal("URL", class extends originalURL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = vi.fn();
    });
    try {
      render(<KarigarAccountDrawer workshopId={workshop.id} onClose={vi.fn()} />);
      fireEvent.click(await screen.findByRole("button", { name: "[ne] CSV" }));
      await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
      const blob = createObjectURL.mock.calls[0][0] as Blob;
      const csv = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsText(blob);
      });
      expect(csv).toContain('"Date, translated","[ne] Kind","[ne] Event Type"');
      expect(csv).toContain('"[ne] MONEY","[ne] SETTLEMENT PAYMENT","Bridal necklace SKU-123"');
      expect(csv).toContain('500,"[ne] BANK TRANSFER","TXN-123","Customer note"');
      expectUserDataUntranslated();
    } finally {
      click.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("translates cost statuses and payment methods without translating product names or references", async () => {
    render(<JobCostSummaryModal jobId={job.id} currency="NPR" onClose={vi.fn()} />);
    expect(await screen.findByText("[ne] PENDING")).toBeInTheDocument();
    expect(screen.getByText(/\[ne\] BANK TRANSFER/)).toBeInTheDocument();
    expect(screen.getByText(/Bridal necklace SKU-123/)).toBeInTheDocument();
    expectUserDataUntranslated();
  });

  it.each([
    { response: { data: { message: "Job costs unavailable" } } },
    new Error("Network failure"),
  ])("translates cost API errors and fallback errors", async (error) => {
    vi.mocked(karigarApi.getJobCostSummary).mockRejectedValueOnce(error);
    render(<JobCostSummaryModal jobId={job.id} currency="NPR" onClose={vi.fn()} />);
    const message = "response" in error ? "Job costs unavailable" : "Failed to load job cost breakdown";
    expect(await screen.findByText(`[ne] ${message}`)).toBeInTheDocument();
  });

  it("translates printable event labels and fallback headings while retaining user data", async () => {
    render(<KarigarStatementPrint workshop={{ ...workshop, name: "" }} currency="NPR" summary={summary}
      metalBalances={[]} items={items} />);
    expect(await screen.findByText("[ne] Jewellery Workshop")).toBeInTheDocument();
    expect(screen.getByText("[ne] SETTLEMENT PAYMENT")).toBeInTheDocument();
    expect(screen.getByText(job.product)).toBeInTheDocument();
    expectUserDataUntranslated();
  });
});
