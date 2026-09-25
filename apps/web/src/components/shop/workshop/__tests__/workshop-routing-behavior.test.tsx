import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import KarigarSupplyChainPage from "@/app/dashboard/shop/supply-chain/page";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import { useSearchParams } from "next/navigation";

vi.mock("@/components/auth/RouteGuard", () => ({
  ShopGuard: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/dashboard/DashboardLayout", () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock("@/components/FeatureGate", () => ({
  FeatureGate: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/ui/T", () => ({
  T: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/providers/translation-provider", () => ({
  useT: () => (str: string) => str,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useFeatures", () => ({
  useFeatures: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

vi.mock("@/components/shop/workshop/overview/WorkshopOverview", () => ({
  WorkshopOverview: () => <div data-testid="workshop-overview-view">Workshop Overview Control Tower</div>,
}));

vi.mock("@/components/shop/workshop/jobs/WorkshopJobsModule", () => ({
  WorkshopJobsModule: () => <div data-testid="workshop-jobs-view">Workshop Jobs Module</div>,
}));

vi.mock("@/components/shop/workshop/production/WorkshopProductionFloor", () => ({
  WorkshopProductionFloor: () => <div data-testid="workshop-production-view">Workshop Production Floor</div>,
}));

vi.mock("@/components/shop/workshop/metal/WorkshopMetalModule", () => ({
  WorkshopMetalModule: () => <div data-testid="workshop-metal-view">Workshop Metal Ledger</div>,
}));

vi.mock("@/components/shop/workshop/transfers/WorkshopTransfersModule", () => ({
  WorkshopTransfersModule: () => <div data-testid="workshop-transfers-view">Workshop Transfers Module</div>,
}));

vi.mock("@/components/shop/workshop/recovery/WorkshopRecoveryModule", () => ({
  WorkshopRecoveryModule: () => <div data-testid="workshop-recovery-view">Workshop Recovery Module</div>,
}));

vi.mock("@/components/shop/workshop/qc/WorkshopQcModule", () => ({
  WorkshopQcModule: () => <div data-testid="workshop-qc-view">Workshop QC Module</div>,
}));

vi.mock("@/components/shop/workshop/reports/WorkshopReportsModule", () => ({
  WorkshopReportsModule: () => <div data-testid="workshop-reports-view">Workshop Reports Module</div>,
}));

vi.mock("@/components/shop/workshop/settings/WorkshopSettingsModule", () => ({
  WorkshopSettingsModule: () => <div data-testid="workshop-settings-view">Workshop Settings Module</div>,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    karigarApi: {
      getSnapshot: vi.fn().mockResolvedValue({ data: { workshops: [], jobs: [], vault: {} } }),
      getLossSummary: vi.fn().mockResolvedValue({ data: { items: [] } }),
      getLiveRates: vi.fn().mockResolvedValue({ data: { rate24k: 7200, rate22k: 6600, rate18k: 5400, silver: 85 } }),
    },
    materialsApi: {
      getCustomMaterials: vi.fn().mockResolvedValue([]),
    },
  };
});

describe("Workshop Supply Chain Routing & Workspace Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to Karigar Book when Workshop Mode is OFF", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u-1", shop: { id: "s-1", workshopMode: false } },
    } as any);
    vi.mocked(useFeatures).mockReturnValue({
      hasFeature: vi.fn().mockReturnValue(false),
      planName: "PRO",
      loading: false,
      status: "ready",
      error: null,
      refresh: vi.fn(),
    } as any);
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as any);

    render(<KarigarSupplyChainPage />);

    expect(screen.queryByTestId("workshop-overview-view")).not.toBeInTheDocument();
    expect(screen.queryByTestId("supply-chain-nav")).not.toBeInTheDocument();
  });

  it("defaults to Workshop Overview when Workshop Mode is ON and feature is enabled", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u-1", shop: { id: "s-1", workshopMode: true } },
    } as any);
    vi.mocked(useFeatures).mockReturnValue({
      hasFeature: vi.fn().mockImplementation((f: string) => f === "workshopManufacturing"),
      planName: "ENTERPRISE",
      loading: false,
      status: "ready",
      error: null,
      refresh: vi.fn(),
    } as any);
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as any);

    render(<KarigarSupplyChainPage />);

    expect(screen.getByTestId("workshop-overview-view")).toBeInTheDocument();
    expect(screen.getByText("Workshop mode on")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Jobs")).toBeInTheDocument();
    expect(screen.getByText("Production")).toBeInTheDocument();
    expect(screen.getByText("Metal")).toBeInTheDocument();
    expect(screen.getByText("Transfers")).toBeInTheDocument();
    expect(screen.getByText("Recovery")).toBeInTheDocument();
    expect(screen.getByText("QC")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Karigar Book")).toBeInTheDocument();
    expect(screen.getByText("Factory Settings")).toBeInTheDocument();
  });

  it("renders Karigar Book explicitly when requested with ?view=book even if Workshop Mode is ON", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u-1", shop: { id: "s-1", workshopMode: true } },
    } as any);
    vi.mocked(useFeatures).mockReturnValue({
      hasFeature: vi.fn().mockImplementation((f: string) => f === "workshopManufacturing"),
      planName: "ENTERPRISE",
      loading: false,
      status: "ready",
      error: null,
      refresh: vi.fn(),
    } as any);
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("view=book") as any);

    render(<KarigarSupplyChainPage />);

    expect(screen.queryByTestId("workshop-overview-view")).not.toBeInTheDocument();
    expect(screen.getByText("Workshop mode on")).toBeInTheDocument();
  });

  it("renders the dedicated modular view when specified by ?view query", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u-1", shop: { id: "s-1", workshopMode: true } },
    } as any);
    vi.mocked(useFeatures).mockReturnValue({
      hasFeature: vi.fn().mockImplementation((f: string) => f === "workshopManufacturing"),
      planName: "ENTERPRISE",
      loading: false,
      status: "ready",
      error: null,
      refresh: vi.fn(),
    } as any);

    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("view=production") as any);
    const { unmount: unmount1 } = render(<KarigarSupplyChainPage />);
    expect(screen.getByTestId("workshop-production-view")).toBeInTheDocument();
    unmount1();

    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("view=transfers") as any);
    const { unmount: unmount2 } = render(<KarigarSupplyChainPage />);
    expect(screen.getByTestId("workshop-transfers-view")).toBeInTheDocument();
    unmount2();

    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("view=recovery") as any);
    const { unmount: unmount3 } = render(<KarigarSupplyChainPage />);
    expect(screen.getByTestId("workshop-recovery-view")).toBeInTheDocument();
    unmount3();
  });
});
