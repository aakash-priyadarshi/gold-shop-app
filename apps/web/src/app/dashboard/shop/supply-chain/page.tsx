"use client";

import WorkshopFloorView from "@/app/dashboard/shop/workshop/floor/page";
import WorkshopJobsView from "@/app/dashboard/shop/workshop/jobs/page";
import WorkshopKarigarsView from "@/app/dashboard/shop/workshop/karigars/page";
import WorkshopMetalView from "@/app/dashboard/shop/workshop/ledger/page";
import WorkshopTowerView from "@/app/dashboard/shop/workshop/page";
import WorkshopProcurementView from "@/app/dashboard/shop/workshop/procurement/page";
import WorkshopQcView from "@/app/dashboard/shop/workshop/qc/page";
import WorkshopReportsView from "@/app/dashboard/shop/workshop/reports/page";
import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FeatureGate } from "@/components/FeatureGate";
import { WorkshopJobCardView } from "@/components/shop/workshop/WorkshopJobCardView";
import { useTourContext } from "@/components/tutorial/useTourContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { T } from "@/components/ui/T";
import { GoldLossReport } from "@/components/shop/karigar/GoldLossReport";
import { KarigarJobGoldCard } from "@/components/shop/karigar/KarigarJobGoldCard";
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import { materialsApi, karigarApi } from "@/lib/api";
import { getMobileMarketParams } from "@/lib/mobileCurrency";
import {
  parseWorkshopView,
  supplyChainHref,
  type WorkshopView,
} from "@/lib/workshop-route";
import { useT } from "@/providers/translation-provider";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Edit3,
  Hammer,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { KarigarAccountDrawer } from "@/components/shop/karigar/KarigarAccountDrawer";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

// ── Types ──
interface Workshop {
  id: string;
  name: string;
  artisan: string;
  location: string;
  phone?: string;
  email?: string;
  rating: number;
  metalIssued: number;
  metalReturned: number;
  wastagePercent: number;
  wastageLimit: number;
  wageRatePerGram: number;
  outstandingBalance: number;
  wageDue: number;
  amountPayable?: number;
  advanceBalance?: number;
  netPayable?: number;
  totalWagesAccrued?: number;
  totalSettlementsPaid?: number;
  totalAdvances?: number;
}

interface Job {
  id: string;
  product: string;
  artisan: string;
  workshopId?: string | null;
  grossWeight: number;
  status: string;
  archived?: boolean;
  readOnly?: boolean;
  allowedWastagePercent?: number;
  goldLoss?: any;
  stages?: any[];
  trees?: any[];
  steps?: {
    casting: boolean;
    filing: boolean;
    setting: boolean;
    polishing: boolean;
    hallmark: boolean;
  };
  updatedAt: string;
}

interface VaultReserves {
  goldGrains24k: number;
  goldBars24k: number;
  silverBullion999: number;
  [key: string]: number; // allow custom material types
}

// ── Default Material Types (built-in) ──
const BUILT_IN_METALS = [
  { key: "GOLD_24K", label: "Gold Grains (24K)", vaultKey: "goldGrains24k" },
  {
    key: "GOLD_BARS_24K",
    label: "Gold Cast Bars (24K)",
    vaultKey: "goldBars24k",
  },
  {
    key: "SILVER_999",
    label: "Silver Bullion (999)",
    vaultKey: "silverBullion999",
  },
];

export default function KarigarSupplyChainPage() {
  return (
    <ShopGuard>
      <DashboardLayout>
        <Suspense
          fallback={
            <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <T>Loading Supply Chain…</T>
            </div>
          }
        >
          <SupplyChainRouteContent />
        </Suspense>
      </DashboardLayout>
    </ShopGuard>
  );
}

const FACTORY_VIEWS: Array<{ view: WorkshopView; label: string }> = [
  { view: "tower", label: "Tower" },
  { view: "jobs", label: "Jobs" },
  { view: "floor", label: "Floor" },
  { view: "metal", label: "Metal" },
  { view: "qc", label: "QC" },
  { view: "reports", label: "Reports" },
];

function SupplyChainRouteContent() {
  const { user } = useAuth();
  const {
    hasFeature,
    planName,
    loading,
    status,
    error,
    refresh,
  } = useFeatures();
  const searchParams = useSearchParams();
  const requested = searchParams.get("view");
  const view = requested ? parseWorkshopView(requested) : null;
  const workshopMode = !!user?.shop?.workshopMode;
  const workshopEnabled = hasFeature("workshopManufacturing");
  const activeNav = view === "job" ? "jobs" : view;
  const setTourSubKey = useTourContext((state) => state.setSubKey);

  useEffect(() => {
    if (!view) {
      setTourSubKey(null);
      return () => setTourSubKey(null);
    }
    if (loading && status !== "ready") {
      setTourSubKey(null);
      return () => setTourSubKey(null);
    }
    if (!workshopEnabled || !workshopMode) {
      setTourSubKey("workshop-locked");
      return () => setTourSubKey(null);
    }
    setTourSubKey(view === "job" ? "workshop-job" : `workshop-${view}`);
    return () => setTourSubKey(null);
  }, [loading, setTourSubKey, status, view, workshopEnabled, workshopMode]);

  const nav = (
    <div
      data-tour="supply-chain-nav"
      className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2"
    >
      <Button
        data-tour="supply-nav-book"
        variant={view ? "ghost" : "default"}
        size="sm"
        asChild
      >
        <Link href={supplyChainHref()}>
          <T>Karigar book</T>
        </Link>
      </Button>
      {FACTORY_VIEWS.map((item) => (
        <Button
          key={item.view}
          data-tour={`supply-nav-${item.view}`}
          variant={activeNav === item.view ? "default" : "ghost"}
          size="sm"
          asChild
        >
          <Link href={supplyChainHref(item.view)}>
            <T>{item.label}</T>
          </Link>
        </Button>
      ))}
      <span
        data-tour="supply-nav-mode"
        className="ms-auto px-2 text-xs text-muted-foreground"
      >
        {workshopMode ? <T>Workshop mode on</T> : <T>Workshop mode off</T>}
      </span>
    </div>
  );

  if (!view) {
    return (
      <div className="space-y-4">
        {nav}
        <KarigarSupplyChainLedger />
      </div>
    );
  }

  if (loading && status !== "ready") {
    return (
      <div className="space-y-4">
        {nav}
        <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <T>Checking workshop access…</T>
        </div>
      </div>
    );
  }

  if (error && !workshopEnabled) {
    return (
      <div className="space-y-4">
        {nav}
        <Card data-tour="workshop-locked" className="max-w-xl border-red-200">
          <CardHeader>
            <CardTitle>
              <T>Could not verify workshop access</T>
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void refresh()}>
              <T>Retry plan check</T>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workshopEnabled) {
    return (
      <div className="space-y-4">
        {nav}
        <div data-tour="workshop-locked">
          <FeatureGate
            feature="workshopManufacturing"
            featureLabel="Workshop manufacturing (factory floor)"
            hasFeature={hasFeature}
            planName={planName}
            loading={false}
          >
            <WorkshopWorkspace view={view} jobId={searchParams.get("id")} />
          </FeatureGate>
        </div>
      </div>
    );
  }

  if (!workshopMode) {
    return (
      <div className="space-y-4">
        {nav}
        <Card data-tour="workshop-locked" className="max-w-xl">
          <CardHeader>
            <CardTitle>
              <T>Workshop mode is off</T>
            </CardTitle>
            <CardDescription>
              <T>
                Turn on Workshop mode in Shop Settings to use factory views
                inside Supply Chain. Your karigar book remains available.
              </T>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/shop/settings?tab=preferences">
                <T>Open shop settings</T>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {nav}
      <WorkshopWorkspace view={view} jobId={searchParams.get("id")} />
    </div>
  );
}

function WorkshopWorkspace({
  view,
  jobId,
}: {
  view: WorkshopView;
  jobId: string | null;
}) {
  switch (view) {
    case "jobs":
      return <WorkshopJobsView />;
    case "job":
      return jobId ? (
        <WorkshopJobCardView jobId={jobId} />
      ) : (
        <WorkshopJobsView />
      );
    case "floor":
      return <WorkshopFloorView />;
    case "metal":
      return <WorkshopMetalView />;
    case "qc":
      return <WorkshopQcView />;
    case "reports":
      return <WorkshopReportsView />;
    case "karigars":
      return <WorkshopKarigarsView />;
    case "procurement":
      return <WorkshopProcurementView />;
    case "tower":
    default:
      return <WorkshopTowerView />;
  }
}

function KarigarSupplyChainLedger() {
  const { user } = useAuth();
  const { hasFeature, planName, loading: featuresLoading } = useFeatures();
  const t = useT();

  // Tickers and Live Market Rates State
  const [goldRates, setGoldRates] = useState({
    rate24k: 7250,
    rate22k: 6645,
    rate18k: 5437,
    silver: 85,
    currency: "INR",
    updatedAt: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    changePercent: 0.85,
    live: false,
  });
  const ratesRef = useRef(false);

  // Database persistent states (start empty — no hardcoded mocks)
  const [vaultReserves, setVaultReserves] = useState<VaultReserves>({
    goldGrains24k: 0,
    goldBars24k: 0,
    silverBullion999: 0,
  });
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [goldLoss, setGoldLoss] = useState<any>(null);
  const [customMaterials, setCustomMaterials] = useState<
    { key: string; label: string; vaultKey: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  // ── Toast notification ──
  const [toastMsg, setToastMsg] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setToastMsg({ message, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // ── Allot Metal Modal ──
  const [allotModalOpen, setAllotModalOpen] = useState(false);
  const [allotForm, setAllotForm] = useState({
    workshopId: "",
    metalType: "GOLD_24K",
    weight: "",
  });

  // ── Procure Bullion Modal ──
  const [procureModalOpen, setProcureModalOpen] = useState(false);
  const [procureForm, setProcureForm] = useState({
    metalType: "GOLD_24K",
    weight: "",
  });

  // ── Add Custom Material Type ──
  const [addMaterialModalOpen, setAddMaterialModalOpen] = useState(false);
  const [newMaterialForm, setNewMaterialForm] = useState({
    label: "",
    key: "",
  });

  // ── Add Karigar Modal ──
  const [addKarigarModalOpen, setAddKarigarModalOpen] = useState(false);
  const [karigarForm, setKarigarForm] = useState({
    artisan: "",
    name: "",
    location: "",
    phone: "",
    email: "",
    wastageLimit: "1.0",
    wageRatePerGram: "200",
  });

  // ── Edit Karigar Modal ──
  const [editKarigarModalOpen, setEditKarigarModalOpen] = useState(false);
  const [editKarigarForm, setEditKarigarForm] = useState<Workshop | null>(null);

  // ── Delete Karigar Confirm ──
  const [deleteKarigarId, setDeleteKarigarId] = useState<string | null>(null);
  const [selectedAccountWorkshopId, setSelectedAccountWorkshopId] =
    useState<string | null>(null);

  // ── Add Job Modal ──
  const [addJobModalOpen, setAddJobModalOpen] = useState(false);
  const [jobForm, setJobForm] = useState({
    product: "",
    workshopId: "",
    grossWeight: "",
  });

  // ── Edit Job Modal ──
  const [editJobModalOpen, setEditJobModalOpen] = useState(false);
  const [editJobForm, setEditJobForm] = useState<Job | null>(null);

  // ── Cancel / archive Job Confirm ──
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);

  // ── All available metals (built-in + custom) ──
  const allMetals = [...BUILT_IN_METALS, ...customMaterials];

  // ── Metal key to vault key mapping ──
  const getVaultKeyForMetal = (metalType: string): string => {
    const match = allMetals.find((m) => m.key === metalType);
    return match?.vaultKey || metalType;
  };

  // ── Read metal rate function ──
  const readMetalRate = (data: any, codes: string[]): number => {
    const metals = data?.metals;
    if (Array.isArray(metals)) {
      const match = metals.find((m: any) => codes.includes(m.code));
      return Number(match?.ratePerGram ?? match?.rate ?? 0);
    }
    if (metals && typeof metals === "object") {
      for (const code of codes) {
        const value = metals[code];
        if (typeof value === "number") return value;
        if (value && typeof value === "object")
          return Number(value.ratePerGram ?? value.rate ?? 0);
      }
    }
    return 0;
  };

  const fetchRates = useCallback(async () => {
    if (ratesRef.current) return;
    ratesRef.current = true;
    try {
      const params = getMobileMarketParams(user?.shop ?? null);
      const res = await materialsApi.getMarketRates(params);
      const data = res.data;
      const live24 = readMetalRate(data, ["GOLD_24K", "XAU", "GOLD"]);
      const live = live24 > 0;
      const rate24k = live ? live24 : 7250;
      setGoldRates({
        rate24k: Math.round(rate24k),
        rate22k: Math.round(
          readMetalRate(data, ["GOLD_22K"]) || rate24k * (22 / 24),
        ),
        rate18k: Math.round(
          readMetalRate(data, ["GOLD_18K"]) || rate24k * (18 / 24),
        ),
        silver: Math.round(
          readMetalRate(data, ["SILVER_999", "SILVER_925", "XAG", "SILVER"]) ||
            85,
        ),
        currency: data?.currency ?? params.currency ?? "INR",
        updatedAt: data?.updatedAt
          ? new Date(data.updatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
        changePercent: live ? (data?.changePercent ?? 0) : 0,
        live,
      });
    } catch {
      setGoldRates((prev) => ({ ...prev, live: false }));
    } finally {
      ratesRef.current = false;
    }
  }, [user?.shop]);

  // Load supply chain settings from database
  const loadDatabaseConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await karigarApi.getSnapshot();
      const dbConfig = res.data ?? res;
      if (dbConfig) {
        if (dbConfig.vaultReserves) setVaultReserves(dbConfig.vaultReserves);
        if (dbConfig.workshops) setWorkshops(dbConfig.workshops);
        if (dbConfig.jobs) setJobs(dbConfig.jobs);
        if (dbConfig.customMaterials)
          setCustomMaterials(dbConfig.customMaterials);
        if (dbConfig.goldLoss) setGoldLoss(dbConfig.goldLoss);
      }
    } catch (err) {
      console.error(
        "Failed to load supply-chain configuration from database:",
        err,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    loadDatabaseConfig();
    const interval = setInterval(() => {
      ratesRef.current = false;
      fetchRates();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRates, loadDatabaseConfig]);

  // ── General persistence helper ──
  const persistState = async (
    updatedReserves: VaultReserves,
    updatedWorkshops: Workshop[],
    _updatedJobs?: Job[],
    updatedCustomMaterials?: typeof customMaterials,
  ) => {
    setSaving(true);
    try {
      await karigarApi.saveSnapshot({
        vaultReserves: updatedReserves,
        workshops: updatedWorkshops,
        customMaterials: updatedCustomMaterials ?? customMaterials,
      });
    } catch (err) {
      console.error("Failed to persist supply chain state to database:", err);
      showToast(t("Failed to save changes to database!"), "error");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    try {
      return new Intl.NumberFormat(
        goldRates.currency === "NPR" ? "ne-NP" : "en-IN",
        {
          style: "currency",
          currency: goldRates.currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        },
      ).format(amount);
    } catch {
      return `${goldRates.currency} ${amount.toLocaleString()}`;
    }
  };

  // ── Calculations ──
  const totalGoldGrams =
    vaultReserves.goldGrains24k + vaultReserves.goldBars24k;
  const totalVaultGoldValue = totalGoldGrams * goldRates.rate24k;
  const totalVaultSilverValue =
    vaultReserves.silverBullion999 * goldRates.silver;
  const grandVaultAssetValuation = totalVaultGoldValue + totalVaultSilverValue;

  const totalOutstandingKarigarGrams = workshops.reduce(
    (sum, w) => sum + w.outstandingBalance,
    0,
  );
  const totalWagesDue = workshops.reduce(
    (sum, w) => sum + (w.amountPayable ?? w.wageDue ?? 0),
    0,
  );
  const totalAdvancesInHand = workshops.reduce(
    (sum, w) => sum + (w.advanceBalance ?? 0),
    0,
  );
  const activeJobsCount = jobs.filter(
    (j) => j.status !== "CANCELLED" && j.status !== "Completed",
  ).length;

  // ═════════════════════════════════════════════════
  // ── CRUD Handlers ──
  // ═════════════════════════════════════════════════

  // ── Add Karigar ──
  const handleAddKarigar = async () => {
    if (!karigarForm.artisan.trim() || !karigarForm.name.trim()) {
      showToast(t("Please fill in the artisan and workshop names!"), "error");
      return;
    }
    const limit = parseFloat(karigarForm.wastageLimit) || 1.0;
    const wage = parseFloat(karigarForm.wageRatePerGram) || 200;

    const newKarigar: Workshop = {
      id: "ws-" + Date.now(),
      name: karigarForm.name,
      artisan: karigarForm.artisan,
      location: karigarForm.location || "Local",
      phone: karigarForm.phone || undefined,
      email: karigarForm.email || undefined,
      rating: 5.0,
      metalIssued: 0,
      metalReturned: 0,
      wastagePercent: 0,
      wastageLimit: limit,
      wageRatePerGram: wage,
      outstandingBalance: 0,
      wageDue: 0,
    };

    const updatedWorkshops = [...workshops, newKarigar];
    setWorkshops(updatedWorkshops);
    setAddKarigarModalOpen(false);
    setKarigarForm({
      artisan: "",
      name: "",
      location: "",
      phone: "",
      email: "",
      wastageLimit: "1.0",
      wageRatePerGram: "200",
    });
    showToast(
      `${t("Karigar")} "${newKarigar.artisan}" ${t("registered successfully!")}`,
    );
    await persistState(vaultReserves, updatedWorkshops, jobs);
  };

  // ── Edit Karigar ──
  const handleEditKarigar = async () => {
    if (!editKarigarForm) return;
    const updatedWorkshops = workshops.map((w) =>
      w.id === editKarigarForm.id ? { ...editKarigarForm } : w,
    );
    setWorkshops(updatedWorkshops);
    setEditKarigarModalOpen(false);
    setEditKarigarForm(null);
    showToast(t("Karigar details updated successfully!"));
    await persistState(vaultReserves, updatedWorkshops, jobs);
  };

  // ── Delete Karigar ──
  const handleDeleteKarigar = async (id: string) => {
    try {
      await karigarApi.deleteWorkshop(id);
      setDeleteKarigarId(null);
      showToast(t("Karigar removed from ledger."));
      await loadDatabaseConfig();
    } catch (err: any) {
      showToast(
        t(err?.response?.data?.message || "Could not remove karigar"),
        "error",
      );
    }
  };

  // ── Allotment handler ──
  const handleAllot = async () => {
    const wt = parseFloat(allotForm.weight);
    if (isNaN(wt) || wt <= 0) {
      showToast(t("Please enter a valid weight to issue."), "error");
      return;
    }
    if (!allotForm.workshopId) {
      showToast(t("Select a karigar before issuing metal."), "error");
      return;
    }

    const vaultKey = getVaultKeyForMetal(allotForm.metalType);
    try {
      await karigarApi.addMovement({
        type: "ISSUE",
        weightGrams: wt,
        workshopId: allotForm.workshopId,
        metalKey: vaultKey,
      });
      setAllotForm((prev) => ({ ...prev, weight: "" }));
      setAllotModalOpen(false);
      showToast(`${t("Issued")} ${wt}g ${t("to workshop successfully!")}`);
      await loadDatabaseConfig();
    } catch (err: any) {
      showToast(
        t(
          err?.response?.data?.message ||
            "Insufficient reserves in vault for this material!",
        ),
        "error",
      );
    }
  };

  // ── Procure handler ──
  const handleProcure = async () => {
    const wt = parseFloat(procureForm.weight);
    if (isNaN(wt) || wt <= 0) {
      showToast(t("Please enter a valid weight to procure."), "error");
      return;
    }

    const vaultKey = getVaultKeyForMetal(procureForm.metalType);
    try {
      await karigarApi.addMovement({
        type: "ADJUST",
        weightGrams: wt,
        metalKey: vaultKey,
        note: "Procure",
      });
      setProcureForm((prev) => ({ ...prev, weight: "" }));
      setProcureModalOpen(false);
      showToast(`${t("Procured")} ${wt}g ${t("into vault reserves!")}`);
      await loadDatabaseConfig();
    } catch (err: any) {
      showToast(
        t(err?.response?.data?.message || "Could not procure bullion"),
        "error",
      );
    }
  };

  // ── Add Custom Material Type ──
  const handleAddMaterial = async () => {
    const label = newMaterialForm.label.trim();
    if (!label) {
      showToast(t("Please enter a material name!"), "error");
      return;
    }
    const vaultKey = "custom_" + label.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const key = "CUSTOM_" + label.toUpperCase().replace(/[^A-Z0-9]/g, "_");

    if (allMetals.find((m) => m.key === key)) {
      showToast(t("This material type already exists!"), "error");
      return;
    }

    const newMaterial = { key, label, vaultKey };
    const updatedCustomMaterials = [...customMaterials, newMaterial];
    const updatedReserves = { ...vaultReserves, [vaultKey]: 0 };

    setCustomMaterials(updatedCustomMaterials);
    setVaultReserves(updatedReserves);
    setAddMaterialModalOpen(false);
    setNewMaterialForm({ label: "", key: "" });
    showToast(`${t("Material")} "${label}" ${t("added to vault!")}`);
    await persistState(
      updatedReserves,
      workshops,
      jobs,
      updatedCustomMaterials,
    );
  };

  // ── Add Job ──
  const handleAddJob = async () => {
    if (!jobForm.product.trim() || !jobForm.workshopId) {
      showToast(
        t("Please fill in the product name and select a karigar."),
        "error",
      );
      return;
    }
    const workshop = workshops.find((w) => w.id === jobForm.workshopId);
    if (!workshop) {
      showToast(t("Select a karigar for this job."), "error");
      return;
    }
    try {
      await karigarApi.createJob({
        product: jobForm.product,
        artisan: workshop.artisan,
        workshopId: workshop.id,
        grossWeight: parseFloat(jobForm.grossWeight) || 0,
      });
      setAddJobModalOpen(false);
      setJobForm({ product: "", workshopId: "", grossWeight: "" });
      showToast(`${t("Job")} "${jobForm.product}" ${t("created!")}`);
      await loadDatabaseConfig();
    } catch (err: any) {
      showToast(
        t(err?.response?.data?.message || "Could not create job"),
        "error",
      );
    }
  };

  // ── Edit Job ──
  const handleEditJob = async () => {
    if (!editJobForm) return;
    try {
      await karigarApi.updateJob(editJobForm.id, {
        product: editJobForm.product,
        artisan: editJobForm.artisan,
        workshopId: editJobForm.workshopId || null,
        grossWeight: editJobForm.grossWeight,
      });
      setEditJobModalOpen(false);
      setEditJobForm(null);
      showToast(t("Job details updated!"));
      await loadDatabaseConfig();
    } catch (err: any) {
      showToast(
        t(err?.response?.data?.message || "Could not update job"),
        "error",
      );
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      await karigarApi.deleteJob(id);
      setDeleteJobId(null);
      showToast(t("Job cancelled and kept in job history."));
      await loadDatabaseConfig();
    } catch (err: any) {
      showToast(
        t(err?.response?.data?.message || "Could not cancel job"),
        "error",
      );
    }
  };

  const filteredWorkshops = workshops.filter(
    (w) =>
      w.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      w.artisan.toLowerCase().includes(filterQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMsg && (
        <div
          className={`fixed top-4 end-4 z-[60] p-4 rounded-xl shadow-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
            toastMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-800 dark:text-rose-200"
          }`}
        >
          <p className="text-sm font-semibold">{toastMsg.message}</p>
          <button
            onClick={() => setToastMsg(null)}
            className="ms-2 text-current opacity-60 hover:opacity-100"
            aria-label={t("Dismiss notification")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Premium Rate Ticker */}
      <div
        data-tour="supply-ticker"
        className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4 backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          {goldRates.live ? (
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </div>
          ) : (
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {goldRates.live ? (
                <T>Live Metal Rate Feed</T>
              ) : (
                <T>Fallback metal rates</T>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {goldRates.live ? (
                <>
                  <T>Updated at</T> {goldRates.updatedAt} ({goldRates.currency})
                </>
              ) : (
                <T>
                  Live feed unavailable — these are last-known fallback prices,
                  not a live ticker.
                </T>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-end">
            <span className="text-xs text-muted-foreground">
              <T>Gold 24K</T>:{" "}
            </span>
            <span className="font-bold text-sm text-yellow-600 dark:text-yellow-400">
              <bdi>{formatCurrency(goldRates.rate24k)}/g</bdi>
            </span>
          </div>
          <div className="text-end">
            <span className="text-xs text-muted-foreground">
              <T>Gold 22K</T>:{" "}
            </span>
            <span className="font-bold text-sm text-yellow-600/80 dark:text-yellow-400/80">
              <bdi>{formatCurrency(goldRates.rate22k)}/g</bdi>
            </span>
          </div>
          <div className="text-end">
            <span className="text-xs text-muted-foreground">
              <T>Gold 18K</T>:{" "}
            </span>
            <span className="font-bold text-sm text-yellow-700/70 dark:text-yellow-400/70">
              <bdi>{formatCurrency(goldRates.rate18k)}/g</bdi>
            </span>
          </div>
          <div className="text-end">
            <span className="text-xs text-muted-foreground">
              <T>Silver 999</T>:{" "}
            </span>
            <span className="font-bold text-sm text-slate-400">
              <bdi>{formatCurrency(goldRates.silver)}/g</bdi>
            </span>
          </div>
        </div>
      </div>

      {/* Header and Quick stats */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Hammer className="h-6 w-6 text-amber-500" />
            <T>Karigar & Bullion Supply Chain</T>
          </h1>
          <p className="text-muted-foreground mt-0.5">
            <T>
              Procure raw metals, issue materials to artisans, and monitor loss
              margins.
            </T>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {saving && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pe-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              <span>
                <T>Saving changes...</T>
              </span>
            </div>
          )}
          <Button
            data-tour="supply-procure"
            variant="outline"
            className="border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 bg-white dark:bg-gray-900"
            onClick={() => setProcureModalOpen(true)}
          >
            <Plus className="h-4 w-4 me-1" />
            <T>Procure Bullion</T>
          </Button>
          <Button
            data-tour="supply-add-karigar"
            variant="outline"
            className="border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 bg-white dark:bg-gray-900"
            onClick={() => setAddKarigarModalOpen(true)}
          >
            <Plus className="h-4 w-4 me-1" />
            <T>Add Karigar</T>
          </Button>
          <Button
            data-tour="supply-add-job"
            variant="outline"
            className="border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 bg-white dark:bg-gray-900"
            onClick={() => {
              if (workshops.length === 0) {
                showToast(t("Add a karigar before creating a job."), "error");
                return;
              }
              setJobForm((p) => ({
                ...p,
                workshopId: p.workshopId || workshops[0].id,
              }));
              setAddJobModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 me-1" />
            <T>Add Job</T>
          </Button>
          <Button
            data-tour="supply-sample-job"
            variant="outline"
            className="border-emerald-500/30 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 bg-white dark:bg-gray-900"
            onClick={async () => {
              const confirmed = window.confirm(
                t(
                  "This demo creates persistent sample workshop, job and metal-ledger records in this shop and may add sample vault metal. Use it only in a test/demo shop or if you intend these sample records to remain until corrected through the supported ledger workflow.",
                ),
              );
              if (!confirmed) return;
              try {
                await karigarApi.loadSampleJob();
                showToast(
                  t(
                    "Persistent demo 1 kg job added. Its workshop, job, vault and metal-ledger records remain in this shop until reconciled through the ledger workflow.",
                  ),
                );
                await loadDatabaseConfig();
              } catch (err: any) {
                showToast(
                  t(
                    err?.response?.data?.message || "Could not load demo job",
                  ),
                  "error",
                );
              }
            }}
          >
            <T>Load demo 1 kg job</T>
          </Button>
          <Button
            data-tour="supply-issue-metal"
            className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
            onClick={() => {
              if (workshops.length === 0) {
                showToast(t("Add a karigar before issuing metal."), "error");
                return;
              }
              setAllotForm((p) => ({
                ...p,
                workshopId: p.workshopId || workshops[0].id,
              }));
              setAllotModalOpen(true);
            }}
          >
            <ArrowUpRight className="h-4 w-4 me-1 rtl:-scale-x-100" />
            <T>Issue Metal</T>
          </Button>
        </div>
      </div>

      <FeatureGate
        feature="karigarSupplyChain"
        featureLabel="Karigar & Bullion Supply Chain Tracker"
        hasFeature={hasFeature}
        planName={planName}
        loading={featuresLoading}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-xs text-muted-foreground">
              <T>Loading database supply-chain configurations...</T>
            </p>
          </div>
        ) : (
          <>
            {/* Core Bullion Vault Overview */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card
                data-tour="supply-vault"
                className="bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/20 dark:to-gray-900 border-yellow-200/50 dark:border-gray-800"
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardDescription className="uppercase tracking-wider text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                      <T>Vault Bullion Valuation</T>
                    </CardDescription>
                    <Coins className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {formatCurrency(grandVaultAssetValuation)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    <T>
                      Asset value of raw 24K gold and silver bullion currently
                      in vault.
                    </T>
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardDescription className="uppercase tracking-wider text-xs font-semibold text-gray-500 dark:text-gray-400">
                      <T>Active Allotment Float</T>
                    </CardDescription>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {totalOutstandingKarigarGrams.toFixed(1)}{" "}
                    <span className="text-xs text-muted-foreground">
                      <T>grams</T>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    <T>
                      Raw precious metals issued to Karigars currently in active
                      fabrication.
                    </T>
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardDescription className="uppercase tracking-wider text-xs font-semibold text-gray-500 dark:text-gray-400">
                      <T>Outstanding Karigar Wages</T>
                    </CardDescription>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalWagesDue)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    <T>
                      Accrued when finished metal is returned at the configured
                      labor rate. Paying a wage is a separate settlement.
                    </T>
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Vault Physical Reserve Inventory */}
            <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    <T>Vault Physical Reserve Inventory</T>
                  </CardTitle>
                  <CardDescription>
                    <T>
                      Unfinished raw metal grains and bars currently available
                      for workshop allotment.
                    </T>
                  </CardDescription>
                </div>
                <Button
                  data-tour="supply-add-material"
                  size="sm"
                  variant="outline"
                  className="border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                  onClick={() => setAddMaterialModalOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 me-1" />
                  <T>Add Material Type</T>
                </Button>
              </CardHeader>
              <CardContent>
                {/* Show built-in metals */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">
                        <T>24K Gold Grains</T>
                      </p>
                      <p className="text-lg font-bold mt-1 text-yellow-600 dark:text-yellow-400">
                        {vaultReserves.goldGrains24k.toFixed(2)} g
                      </p>
                    </div>
                    <Badge className="bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 text-xs">
                      <T>Purity</T>: <bdi>99.9%</bdi>
                    </Badge>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">
                        <T>24K Gold Cast Bars</T>
                      </p>
                      <p className="text-lg font-bold mt-1 text-yellow-600 dark:text-yellow-400">
                        {vaultReserves.goldBars24k.toFixed(2)} g
                      </p>
                    </div>
                    <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs">
                      <T>Hallmarked</T>
                    </Badge>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between text-gray-700 dark:text-gray-300">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">
                        <T>999 Silver Scrap/Grain</T>
                      </p>
                      <p className="text-lg font-bold mt-1 text-slate-400">
                        {vaultReserves.silverBullion999.toFixed(2)} g
                      </p>
                    </div>
                    <Badge className="bg-slate-500/10 text-slate-600 border border-slate-500/20 text-xs">
                      <bdi>Ag 99.9%</bdi>
                    </Badge>
                  </div>
                </div>

                {/* Show custom material reserves */}
                {customMaterials.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-3 mt-4">
                    {customMaterials.map((mat) => (
                      <div
                        key={mat.key}
                        className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between text-gray-700 dark:text-gray-300"
                      >
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">
                            <T>{mat.label}</T>
                          </p>
                          <p className="text-lg font-bold mt-1 text-amber-500">
                            {(vaultReserves[mat.vaultKey] || 0).toFixed(2)} g
                          </p>
                        </div>
                        <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs">
                          <T>Custom</T>
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state */}
                {vaultReserves.goldGrains24k === 0 &&
                  vaultReserves.goldBars24k === 0 &&
                  vaultReserves.silverBullion999 === 0 &&
                  customMaterials.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 mt-4">
                      <Coins className="h-8 w-8 text-amber-300" />
                      <p className="text-sm text-muted-foreground">
                        <T>
                          Vault is empty. Procure raw bullion to start issuing
                          metals to your Karigars.
                        </T>
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Karigar Overview KPI Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"><T>Float with Karigars</T></p>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {totalOutstandingKarigarGrams.toFixed(2)} g
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5"><T>Physical metal issued</T></p>
              </Card>
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"><T>Accrued Wages</T></p>
                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                  {formatCurrency(totalWagesDue)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5"><T>Awaiting settlement</T></p>
              </Card>
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"><T>Advances in Hand</T></p>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                  {formatCurrency(totalAdvancesInHand)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5"><T>Prepaid against future jobs</T></p>
              </Card>
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"><T>Active Jobs</T></p>
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  {activeJobsCount}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5"><T>In production stages</T></p>
              </Card>
            </div>

            {/* Karigar Ledgers + Jobs */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Karigar Ledger Table */}
              <Card
                data-tour="supply-ledger"
                className="lg:col-span-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
              >
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      <T>Artisan (Karigar) Balances & Wastage</T>
                    </CardTitle>
                    <CardDescription>
                      <T>
                        Tracks metal weight issued to workshops vs finished
                        metal weights returned.
                      </T>
                    </CardDescription>
                  </div>
                  <div className="relative w-48">
                    <Search className="absolute start-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder={t("Search artisans...")}
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      className="ps-8 text-xs h-8 rounded-lg border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {workshops.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                      <div className="h-14 w-14 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                        <Users className="h-7 w-7 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                          <T>No artisans registered yet</T>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                          <T>
                            Register your first Karigar to start tracking
                            workshop metal flows, wastage margins, and
                            outstanding fabrication balances.
                          </T>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800/40 dark:text-amber-400"
                        onClick={() => setAddKarigarModalOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5 me-1.5" />
                        <T>Register First Karigar</T>
                      </Button>
                    </div>
                  ) : (
                    <table className="w-full text-sm border-collapse text-start">
                      <thead>
                        <tr className="border-b dark:border-gray-800 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                          <th className="py-2.5 px-3 font-semibold">
                            <T>Karigar & Workshop</T>
                          </th>
                          <th className="py-2.5 px-3 font-semibold">
                            <T>Issued (g)</T>
                          </th>
                          <th className="py-2.5 px-3 font-semibold">
                            <T>Returned (g)</T>
                          </th>
                          <th className="py-2.5 px-3 font-semibold">
                            <T>Wastage %</T>
                          </th>
                          <th className="py-2.5 px-3 font-semibold">
                            <T>Float Bal (g)</T>
                          </th>
                          <th className="py-2.5 px-3 font-semibold text-end">
                            <T>Account / Wages</T>
                          </th>
                          <th className="py-2.5 px-3 font-semibold text-center">
                            <T>Actions</T>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-800">
                        {filteredWorkshops.map((w) => {
                          const isExceeded = w.wastagePercent > w.wastageLimit;
                          return (
                            <tr
                              key={w.id}
                              className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 text-gray-700 dark:text-gray-300"
                            >
                              <td className="py-3 px-3">
                                <p
                                  className="font-semibold text-gray-900 dark:text-gray-100"
                                  dir="auto"
                                >
                                  {w.artisan}
                                </p>
                                <p
                                  className="text-xs text-muted-foreground"
                                  dir="auto"
                                >
                                  {w.name} &middot; {w.location}
                                </p>
                                {(w.phone || w.email) && (
                                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                    {w.phone && (
                                      <span
                                        className="flex items-center gap-0.5"
                                        dir="ltr"
                                      >
                                        <Phone className="h-2.5 w-2.5" />{" "}
                                        {w.phone}
                                      </span>
                                    )}
                                    {w.email && (
                                      <span
                                        className="flex items-center gap-0.5"
                                        dir="ltr"
                                      >
                                        <Mail className="h-2.5 w-2.5" />{" "}
                                        {w.email}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 font-medium text-gray-900 dark:text-gray-100">
                                {w.metalIssued.toFixed(1)}
                              </td>
                              <td className="py-3 px-3">
                                {w.metalReturned.toFixed(1)}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex items-center gap-1 font-semibold text-xs ${
                                    isExceeded
                                      ? "text-rose-600 dark:text-rose-400"
                                      : "text-emerald-600 dark:text-emerald-400"
                                  }`}
                                >
                                  {w.wastagePercent.toFixed(2)}%
                                  <span className="text-[10px] text-muted-foreground">
                                    ({t("Limit")} {w.wastageLimit}%)
                                  </span>
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <Badge
                                  variant={
                                    w.outstandingBalance > 0
                                      ? "outline"
                                      : "secondary"
                                  }
                                  className={
                                    w.outstandingBalance > 0
                                      ? "border-amber-500/25 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                                      : ""
                                  }
                                >
                                  {w.outstandingBalance.toFixed(1)} g
                                </Badge>
                              </td>
                              <td className="py-3 px-3 font-bold text-end">
                                {w.advanceBalance && w.advanceBalance > 0 ? (
                                  <span className="text-purple-600 dark:text-purple-400 text-xs font-semibold">
                                    Adv: {formatCurrency(w.advanceBalance)}
                                  </span>
                                ) : (
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {formatCurrency(w.amountPayable ?? w.wageDue)}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedAccountWorkshopId(w.id)}
                                    className="h-7 px-2.5 text-xs font-bold text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                  >
                                    <T>Account</T>
                                  </Button>
                                  <button
                                    onClick={() => {
                                      setEditKarigarForm({ ...w });
                                      setEditKarigarModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600 dark:text-amber-400 transition-colors"
                                    title={t("Edit Karigar")}
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteKarigarId(w.id)}
                                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 dark:text-rose-400 transition-colors"
                                    title={t("Delete Karigar")}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              {/* Jobs with gold-loss stages + casting trees */}
              <Card
                data-tour="supply-pipeline"
                className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
              >
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    <T>Artisan Fabrication Pipeline</T>
                  </CardTitle>
                  <CardDescription>
                    <T>
                      Track gold in and out at each stage. Casting trees
                      reconcile issued metal against finished pieces, sprue, and
                      recoverable scrap.
                    </T>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                      <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                        <Hammer className="h-6 w-6 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                          <T>No active fabrication jobs</T>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                          <T>
                            Create a real job to record issued gold, scrap, and
                            unexplained loss. The demo job creates persistent
                            sample records, so use it only in a test/demo shop
                            or when you intend to reconcile its ledger entries.
                          </T>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800/40 dark:text-blue-400"
                        onClick={() => setAddJobModalOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5 me-1.5" />
                        <T>Create First Job</T>
                      </Button>
                    </div>
                  ) : (
                    jobs.map((j) => (
                      <KarigarJobGoldCard
                        key={j.id}
                        job={j}
                        onChanged={() => void loadDatabaseConfig()}
                        onEdit={() => {
                          setEditJobForm({ ...j });
                          setEditJobModalOpen(true);
                        }}
                        onDelete={() => setDeleteJobId(j.id)}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
              <Card
                data-tour="supply-gold-loss-card"
                className="md:col-span-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-semibold">
                      <T>Gold Loss / Wastage Report</T>
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.print()}
                    >
                      <T>Print</T>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <GoldLossReport report={goldLoss} />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </FeatureGate>

      {/* ═══════════════════════════════════════════ */}
      {/* ─── MODALS ─── */}
      {/* ═══════════════════════════════════════════ */}

      {/* 1. Allot/Issue Metal modal */}
      {allotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                <T>Issue Bullion to Workshop</T>
              </h3>
              <button
                onClick={() => setAllotModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              <T>
                Allot raw metal from vault directly into the artisan float
                ledger balance.
              </T>
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Select Workshop/Artisan</T>
                </Label>
                <Select
                  value={allotForm.workshopId}
                  onValueChange={(val) =>
                    setAllotForm((p) => ({ ...p, workshopId: val }))
                  }
                >
                  <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder={t("Select artisan...")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    {workshops.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.artisan} ({w.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Metal Material</T>
                </Label>
                <Select
                  value={allotForm.metalType}
                  onValueChange={(val) =>
                    setAllotForm((p) => ({ ...p, metalType: val }))
                  }
                >
                  <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    {allMetals.map((m) => (
                      <SelectItem key={m.key} value={m.key}>
                        <T>{m.label}</T>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Weight (grams)</T>
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 50"
                  value={allotForm.weight}
                  onChange={(e) =>
                    setAllotForm((p) => ({ ...p, weight: e.target.value }))
                  }
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAllotModalOpen(false)}
                className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <T>Cancel</T>
              </Button>
              <Button
                className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
                size="sm"
                disabled={!allotForm.workshopId}
                onClick={handleAllot}
              >
                <T>Issue Metal</T>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Procure modal — with all material types */}
      {procureModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                <T>Procure Raw Bullion</T>
              </h3>
              <button
                onClick={() => setProcureModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              <T>Record the physical bullion entering this vault. This does not create a supplier bill, supplier payment, or customer invoice.</T>
            </p>
            <p className="text-xs text-muted-foreground">
              <T>
                Log wholesale bullion grains purchase, adding raw materials
                balance to the safe vault reserves.
              </T>
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Metal Material</T>
                </Label>
                <Select
                  value={procureForm.metalType}
                  onValueChange={(val) =>
                    setProcureForm((p) => ({ ...p, metalType: val }))
                  }
                >
                  <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    {allMetals.map((m) => (
                      <SelectItem key={m.key} value={m.key}>
                        <T>{m.label}</T>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Weight (grams)</T>
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 100"
                  value={procureForm.weight}
                  onChange={(e) =>
                    setProcureForm((p) => ({ ...p, weight: e.target.value }))
                  }
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setProcureModalOpen(false)}
                className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <T>Cancel</T>
              </Button>
              <Button
                className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
                size="sm"
                onClick={handleProcure}
              >
                <T>Add to Vault</T>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add Custom Material Type modal */}
      {addMaterialModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                <T>Add Custom Material Type</T>
              </h3>
              <button
                onClick={() => setAddMaterialModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              <T>
                Register a custom material type (e.g. Platinum, Rose Gold 14K,
                Palladium) to track in your vault and issue to artisans.
              </T>
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Material Name *</T>
                </Label>
                <Input
                  type="text"
                  placeholder={t("e.g. Platinum 950")}
                  dir="auto"
                  value={newMaterialForm.label}
                  onChange={(e) =>
                    setNewMaterialForm((p) => ({ ...p, label: e.target.value }))
                  }
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddMaterialModalOpen(false)}
                className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <T>Cancel</T>
              </Button>
              <Button
                className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
                size="sm"
                onClick={handleAddMaterial}
              >
                <T>Add Material</T>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Add Karigar modal — with phone + email */}
      {addKarigarModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                <T>Add New Artisan (Karigar)</T>
              </h3>
              <button
                onClick={() => setAddKarigarModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              <T>
                Register a new artisan ledger to start tracking issued raw
                metals and labor charges.
              </T>
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Artisan Name *</T>
                </Label>
                <Input
                  type="text"
                  placeholder={t("e.g. Shyam Verma")}
                  dir="auto"
                  value={karigarForm.artisan}
                  onChange={(e) =>
                    setKarigarForm((p) => ({ ...p, artisan: e.target.value }))
                  }
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Workshop Name *</T>
                </Label>
                <Input
                  type="text"
                  placeholder={t("e.g. Verma Filigree Lab")}
                  dir="auto"
                  value={karigarForm.name}
                  onChange={(e) =>
                    setKarigarForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Location</T>
                </Label>
                <Input
                  type="text"
                  placeholder={t("e.g. Varanasi, UP")}
                  dir="auto"
                  value={karigarForm.location}
                  onChange={(e) =>
                    setKarigarForm((p) => ({ ...p, location: e.target.value }))
                  }
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> <T>Phone Number</T>
                  </Label>
                  <Input
                    type="tel"
                    placeholder="+91 62039 65557"
                    dir="ltr"
                    value={karigarForm.phone}
                    onChange={(e) =>
                      setKarigarForm((p) => ({ ...p, phone: e.target.value }))
                    }
                    className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> <T>Email Address</T>
                  </Label>
                  <Input
                    type="email"
                    placeholder="artisan@example.com"
                    dir="ltr"
                    value={karigarForm.email}
                    onChange={(e) =>
                      setKarigarForm((p) => ({ ...p, email: e.target.value }))
                    }
                    className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300">
                    <T>Wastage Limit (%)</T>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="1.0"
                    value={karigarForm.wastageLimit}
                    onChange={(e) =>
                      setKarigarForm((p) => ({
                        ...p,
                        wastageLimit: e.target.value,
                      }))
                    }
                    className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300">
                    <T>Labor Rate (/g)</T>
                  </Label>
                  <Input
                    type="number"
                    placeholder="200"
                    value={karigarForm.wageRatePerGram}
                    onChange={(e) =>
                      setKarigarForm((p) => ({
                        ...p,
                        wageRatePerGram: e.target.value,
                      }))
                    }
                    className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddKarigarModalOpen(false)}
                className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <T>Cancel</T>
              </Button>
              <Button
                className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
                size="sm"
                onClick={handleAddKarigar}
              >
                <T>Register Karigar</T>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Edit Karigar modal */}
      {editKarigarModalOpen && editKarigarForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                <T>Edit Karigar Details</T>
              </h3>
              <button
                onClick={() => {
                  setEditKarigarModalOpen(false);
                  setEditKarigarForm(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Artisan Name</T>
                </Label>
                <Input
                  value={editKarigarForm.artisan}
                  dir="auto"
                  onChange={(e) =>
                    setEditKarigarForm((p) =>
                      p ? { ...p, artisan: e.target.value } : p,
                    )
                  }
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Workshop Name</T>
                </Label>
                <Input
                  value={editKarigarForm.name}
                  dir="auto"
                  onChange={(e) =>
                    setEditKarigarForm((p) =>
                      p ? { ...p, name: e.target.value } : p,
                    )
                  }
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Location</T>
                </Label>
                <Input
                  value={editKarigarForm.location}
                  dir="auto"
                  onChange={(e) =>
                    setEditKarigarForm((p) =>
                      p ? { ...p, location: e.target.value } : p,
                    )
                  }
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> <T>Phone</T>
                  </Label>
                  <Input
                    type="tel"
                    placeholder="+91 62039 65557"
                    dir="ltr"
                    value={editKarigarForm.phone || ""}
                    onChange={(e) =>
                      setEditKarigarForm((p) =>
                        p ? { ...p, phone: e.target.value } : p,
                      )
                    }
                    className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> <T>Email</T>
                  </Label>
                  <Input
                    type="email"
                    placeholder="artisan@example.com"
                    dir="ltr"
                    value={editKarigarForm.email || ""}
                    onChange={(e) =>
                      setEditKarigarForm((p) =>
                        p ? { ...p, email: e.target.value } : p,
                      )
                    }
                    className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300">
                    <T>Wastage Limit (%)</T>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editKarigarForm.wastageLimit}
                    onChange={(e) =>
                      setEditKarigarForm((p) =>
                        p
                          ? {
                              ...p,
                              wastageLimit: parseFloat(e.target.value) || 0,
                            }
                          : p,
                      )
                    }
                    className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300">
                    <T>Labor Rate (/g)</T>
                  </Label>
                  <Input
                    type="number"
                    value={editKarigarForm.wageRatePerGram}
                    onChange={(e) =>
                      setEditKarigarForm((p) =>
                        p
                          ? {
                              ...p,
                              wageRatePerGram: parseFloat(e.target.value) || 0,
                            }
                          : p,
                      )
                    }
                    className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditKarigarModalOpen(false);
                  setEditKarigarForm(null);
                }}
                className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <T>Cancel</T>
              </Button>
              <Button
                className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
                size="sm"
                onClick={handleEditKarigar}
              >
                <T>Save Changes</T>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Delete Karigar Confirmation */}
      {deleteKarigarId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6 text-rose-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              <T>Delete Karigar?</T>
            </h3>
            <p className="text-sm text-muted-foreground">
              <T>
                This will permanently remove this artisan from the ledger. This
                action cannot be undone.
              </T>
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteKarigarId(null)}
                className="text-gray-600 dark:text-gray-400"
              >
                <T>Cancel</T>
              </Button>
              <Button
                size="sm"
                className="bg-rose-500 text-white hover:bg-rose-600"
                onClick={() => handleDeleteKarigar(deleteKarigarId)}
              >
                <T>Delete Karigar</T>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Add Job modal */}
      {addJobModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                <T>Create Fabrication Job</T>
              </h3>
              <button
                onClick={() => setAddJobModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              <T>
                Register a new custom fabrication job and assign it to an
                artisan workshop.
              </T>
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Product / Piece Name *</T>
                </Label>
                <Input
                  type="text"
                  placeholder={t("e.g. 22K Traditional Bridal Choker")}
                  dir="auto"
                  value={jobForm.product}
                  onChange={(e) =>
                    setJobForm((p) => ({ ...p, product: e.target.value }))
                  }
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Artisan / Workshop *</T>
                </Label>
                <Select
                  value={jobForm.workshopId}
                  onValueChange={(val) =>
                    setJobForm((p) => ({ ...p, workshopId: val }))
                  }
                >
                  <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder={t("Select artisan...")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    {workshops.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.artisan} ({w.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Gross Weight (grams)</T>
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 45.5"
                  value={jobForm.grossWeight}
                  onChange={(e) =>
                    setJobForm((p) => ({ ...p, grossWeight: e.target.value }))
                  }
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddJobModalOpen(false)}
                className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <T>Cancel</T>
              </Button>
              <Button
                className="bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                size="sm"
                onClick={handleAddJob}
              >
                <T>Create Job</T>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Edit Job modal */}
      {editJobModalOpen && editJobForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                <T>Edit Job Details</T>
              </h3>
              <button
                onClick={() => {
                  setEditJobModalOpen(false);
                  setEditJobForm(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Product / Piece Name</T>
                </Label>
                <Input
                  value={editJobForm.product}
                  dir="auto"
                  onChange={(e) =>
                    setEditJobForm((p) =>
                      p ? { ...p, product: e.target.value } : p,
                    )
                  }
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Artisan / Workshop</T>
                </Label>
                <Select
                  value={editJobForm.workshopId || undefined}
                  onValueChange={(val) => {
                    const workshop = workshops.find((w) => w.id === val);
                    setEditJobForm((p) =>
                      p
                        ? {
                            ...p,
                            workshopId: val,
                            artisan: workshop?.artisan || p.artisan,
                          }
                        : p,
                    );
                  }}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder={t("Select artisan...")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    {workshops.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.artisan} ({w.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Gross Weight (grams)</T>
                </Label>
                <Input
                  type="number"
                  value={editJobForm.grossWeight}
                  onChange={(e) =>
                    setEditJobForm((p) =>
                      p
                        ? { ...p, grossWeight: parseFloat(e.target.value) || 0 }
                        : p,
                    )
                  }
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditJobModalOpen(false);
                  setEditJobForm(null);
                }}
                className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <T>Cancel</T>
              </Button>
              <Button
                className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
                size="sm"
                onClick={handleEditJob}
              >
                <T>Save Changes</T>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Cancel / archive Job Confirmation */}
      {deleteJobId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6 text-rose-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              <T>Cancel and archive fabrication job?</T>
            </h3>
            <p className="text-sm text-muted-foreground">
              <T>
                This stops the job and keeps its work history visible for
                reference. Use this for a cancelled job, not to correct issued
                metal or finished-goods records.
              </T>
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteJobId(null)}
                className="text-gray-600 dark:text-gray-400"
              >
                <T>Cancel</T>
              </Button>
              <Button
                size="sm"
                className="bg-rose-500 text-white hover:bg-rose-600"
                onClick={() => handleDeleteJob(deleteJobId)}
              >
                <T>Cancel and archive job</T>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Karigar Account & Settlement Ledger Drawer */}
      {selectedAccountWorkshopId && (
        <KarigarAccountDrawer
          workshopId={selectedAccountWorkshopId}
          shopCurrency={goldRates.currency}
          onClose={() => setSelectedAccountWorkshopId(null)}
          onRefreshParent={() => void loadDatabaseConfig()}
        />
      )}
    </div>
  );
}
