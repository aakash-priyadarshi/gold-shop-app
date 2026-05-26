"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { FeatureGate } from "@/components/FeatureGate";
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
import { useAuth } from "@/hooks/useAuth";
import { useFeatures } from "@/hooks/useFeatures";
import { materialsApi, shopsApi } from "@/lib/api";
import { getMobileMarketParams } from "@/lib/mobileCurrency";
import { useT } from "@/providers/translation-provider";
import { Loader2 } from "lucide-react";
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
import { useCallback, useEffect, useRef, useState } from "react";

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
}

interface Job {
  id: string;
  product: string;
  artisan: string;
  grossWeight: number;
  status: string;
  steps: {
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
  { key: "GOLD_BARS_24K", label: "Gold Cast Bars (24K)", vaultKey: "goldBars24k" },
  { key: "SILVER_999", label: "Silver Bullion (999)", vaultKey: "silverBullion999" },
];

export default function KarigarSupplyChainPage() {
  return (
    <ShopGuard>
      <DashboardLayout>
        <KarigarSupplyChainContent />
      </DashboardLayout>
    </ShopGuard>
  );
}

function KarigarSupplyChainContent() {
  const { user, refreshUser } = useAuth();
  const { hasFeature, planName, loading: featuresLoading } = useFeatures();
  const t = useT();

  // Tickers and Live Market Rates State
  const [goldRates, setGoldRates] = useState({
    rate24k: 7250,
    rate22k: 6645,
    rate18k: 5437,
    silver: 85,
    currency: "INR",
    updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    changePercent: 0.85,
  });
  const ratesRef = useRef(false);

  // Database persistent states (start empty — no hardcoded mocks)
  const [vaultReserves, setVaultReserves] = useState<VaultReserves>({ goldGrains24k: 0, goldBars24k: 0, silverBullion999: 0 });
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customMaterials, setCustomMaterials] = useState<{ key: string; label: string; vaultKey: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  // ── Toast notification ──
  const [toastMsg, setToastMsg] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
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
  const [newMaterialForm, setNewMaterialForm] = useState({ label: "", key: "" });

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

  // ── Add Job Modal ──
  const [addJobModalOpen, setAddJobModalOpen] = useState(false);
  const [jobForm, setJobForm] = useState({
    product: "",
    artisan: "",
    grossWeight: "",
  });

  // ── Edit Job Modal ──
  const [editJobModalOpen, setEditJobModalOpen] = useState(false);
  const [editJobForm, setEditJobForm] = useState<Job | null>(null);

  // ── Delete Job Confirm ──
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
        if (value && typeof value === "object") return Number(value.ratePerGram ?? value.rate ?? 0);
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
      const rate24k = readMetalRate(data, ["GOLD_24K", "XAU", "GOLD"]) || 7250;
      setGoldRates({
        rate24k: Math.round(rate24k),
        rate22k: Math.round(readMetalRate(data, ["GOLD_22K"]) || rate24k * (22 / 24)),
        rate18k: Math.round(readMetalRate(data, ["GOLD_18K"]) || rate24k * (18 / 24)),
        silver: Math.round(readMetalRate(data, ["SILVER_999", "SILVER_925", "XAG", "SILVER"]) || 85),
        currency: data?.currency ?? params.currency ?? "INR",
        updatedAt: data?.updatedAt
          ? new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        changePercent: data?.changePercent ?? 0.85,
      });
    } catch {
      // safe fallback remains
    } finally {
      ratesRef.current = false;
    }
  }, [user?.shop]);

  // Load supply chain settings from database
  const loadDatabaseConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await shopsApi.getSettings();
      const s = res.data ?? res;
      const dbConfig = s.bankAccountDetails?.karigarSupplyChain;
      if (dbConfig) {
        if (dbConfig.vaultReserves) setVaultReserves(dbConfig.vaultReserves);
        if (dbConfig.workshops) setWorkshops(dbConfig.workshops);
        if (dbConfig.jobs) setJobs(dbConfig.jobs);
        if (dbConfig.customMaterials) setCustomMaterials(dbConfig.customMaterials);
      }
    } catch (err) {
      console.error("Failed to load supply-chain configuration from database:", err);
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
    updatedJobs: Job[],
    updatedCustomMaterials?: typeof customMaterials,
  ) => {
    setSaving(true);
    try {
      const currentSettingsRes = await shopsApi.getSettings();
      const currentSettings = currentSettingsRes.data ?? currentSettingsRes;
      const bankDetails = currentSettings.bankAccountDetails || {};

      const updatedBankAccountDetails = {
        ...bankDetails,
        karigarSupplyChain: {
          vaultReserves: updatedReserves,
          workshops: updatedWorkshops,
          jobs: updatedJobs,
          customMaterials: updatedCustomMaterials ?? customMaterials,
        },
      };

      await shopsApi.updateSettings({
        bankAccountDetails: updatedBankAccountDetails,
      });
      await refreshUser();
    } catch (err) {
      console.error("Failed to persist supply chain state to database:", err);
      showToast(t("Failed to save changes to database!"), "error");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    try {
      return new Intl.NumberFormat(goldRates.currency === "NPR" ? "ne-NP" : "en-IN", {
        style: "currency",
        currency: goldRates.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${goldRates.currency} ${amount.toLocaleString()}`;
    }
  };

  // ── Calculations ──
  const totalGoldGrams = vaultReserves.goldGrains24k + vaultReserves.goldBars24k;
  const totalVaultGoldValue = totalGoldGrams * goldRates.rate24k;
  const totalVaultSilverValue = vaultReserves.silverBullion999 * goldRates.silver;
  const grandVaultAssetValuation = totalVaultGoldValue + totalVaultSilverValue;

  const totalOutstandingKarigarGrams = workshops.reduce((sum, w) => sum + w.outstandingBalance, 0);
  const totalWagesDue = workshops.reduce((sum, w) => sum + w.wageDue, 0);

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
    showToast(t(`Karigar "${newKarigar.artisan}" registered successfully!`));
    await persistState(vaultReserves, updatedWorkshops, jobs);
  };

  // ── Edit Karigar ──
  const handleEditKarigar = async () => {
    if (!editKarigarForm) return;
    const updatedWorkshops = workshops.map((w) =>
      w.id === editKarigarForm.id ? { ...editKarigarForm } : w
    );
    setWorkshops(updatedWorkshops);
    setEditKarigarModalOpen(false);
    setEditKarigarForm(null);
    showToast(t("Karigar details updated successfully!"));
    await persistState(vaultReserves, updatedWorkshops, jobs);
  };

  // ── Delete Karigar ──
  const handleDeleteKarigar = async (id: string) => {
    const updatedWorkshops = workshops.filter((w) => w.id !== id);
    setWorkshops(updatedWorkshops);
    setDeleteKarigarId(null);
    showToast(t("Karigar removed from ledger."));
    await persistState(vaultReserves, updatedWorkshops, jobs);
  };

  // ── Allotment handler ──
  const handleAllot = async () => {
    const wt = parseFloat(allotForm.weight);
    if (isNaN(wt) || wt <= 0) {
      showToast(t("Please enter a valid weight to issue."), "error");
      return;
    }

    const vaultKey = getVaultKeyForMetal(allotForm.metalType);
    let updatedReserves = { ...vaultReserves };

    if ((updatedReserves[vaultKey] || 0) < wt) {
      showToast(t("Insufficient reserves in vault for this material!"), "error");
      return;
    }
    updatedReserves[vaultKey] = Number(((updatedReserves[vaultKey] || 0) - wt).toFixed(2));

    const updatedWorkshops = workshops.map((w) =>
      w.id === allotForm.workshopId
        ? {
            ...w,
            metalIssued: Number((w.metalIssued + wt).toFixed(2)),
            outstandingBalance: Number((w.outstandingBalance + wt).toFixed(2)),
          }
        : w
    );

    setVaultReserves(updatedReserves);
    setWorkshops(updatedWorkshops);
    setAllotForm((prev) => ({ ...prev, weight: "" }));
    setAllotModalOpen(false);
    showToast(t(`Issued ${wt}g to workshop successfully!`));
    await persistState(updatedReserves, updatedWorkshops, jobs);
  };

  // ── Procure handler ──
  const handleProcure = async () => {
    const wt = parseFloat(procureForm.weight);
    if (isNaN(wt) || wt <= 0) {
      showToast(t("Please enter a valid weight to procure."), "error");
      return;
    }

    const vaultKey = getVaultKeyForMetal(procureForm.metalType);
    let updatedReserves = { ...vaultReserves };
    updatedReserves[vaultKey] = Number(((updatedReserves[vaultKey] || 0) + wt).toFixed(2));

    setVaultReserves(updatedReserves);
    setProcureForm((prev) => ({ ...prev, weight: "" }));
    setProcureModalOpen(false);
    showToast(t(`Procured ${wt}g into vault reserves!`));
    await persistState(updatedReserves, workshops, jobs);
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
    showToast(t(`Material "${label}" added to vault!`));
    await persistState(updatedReserves, workshops, jobs, updatedCustomMaterials);
  };

  // ── Add Job ──
  const handleAddJob = async () => {
    if (!jobForm.product.trim() || !jobForm.artisan.trim()) {
      showToast(t("Please fill in the product name and artisan!"), "error");
      return;
    }
    const newJob: Job = {
      id: "job-" + Date.now(),
      product: jobForm.product,
      artisan: jobForm.artisan,
      grossWeight: parseFloat(jobForm.grossWeight) || 0,
      status: "Casting",
      steps: { casting: false, filing: false, setting: false, polishing: false, hallmark: false },
      updatedAt: "Just now",
    };
    const updatedJobs = [...jobs, newJob];
    setJobs(updatedJobs);
    setAddJobModalOpen(false);
    setJobForm({ product: "", artisan: "", grossWeight: "" });
    showToast(t(`Job "${newJob.product}" created!`));
    await persistState(vaultReserves, workshops, updatedJobs);
  };

  // ── Edit Job ──
  const handleEditJob = async () => {
    if (!editJobForm) return;
    const updatedJobs = jobs.map((j) => (j.id === editJobForm.id ? { ...editJobForm } : j));
    setJobs(updatedJobs);
    setEditJobModalOpen(false);
    setEditJobForm(null);
    showToast(t("Job details updated!"));
    await persistState(vaultReserves, workshops, updatedJobs);
  };

  // ── Delete Job ──
  const handleDeleteJob = async (id: string) => {
    const updatedJobs = jobs.filter((j) => j.id !== id);
    setJobs(updatedJobs);
    setDeleteJobId(null);
    showToast(t("Job removed from pipeline."));
    await persistState(vaultReserves, workshops, updatedJobs);
  };

  // ── Step click toggler ──
  const toggleJobStep = async (jobId: string, stepKey: string) => {
    const updatedJobs = jobs.map((j) => {
      if (j.id !== jobId) return j;
      // @ts-ignore
      const nextSteps = { ...j.steps, [stepKey]: !j.steps[stepKey] };

      let status = "Casting";
      if (nextSteps.hallmark) status = "Completed";
      else if (nextSteps.polishing) status = "Polishing";
      else if (nextSteps.setting) status = "Stone Setting";
      else if (nextSteps.filing) status = "Filing & Assembly";

      return {
        ...j,
        steps: nextSteps,
        status,
        updatedAt: "Just now",
      };
    });

    setJobs(updatedJobs);
    await persistState(vaultReserves, workshops, updatedJobs);
  };

  const filteredWorkshops = workshops.filter(
    (w) =>
      w.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      w.artisan.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-[60] p-4 rounded-xl shadow-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
            toastMsg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-800 dark:text-rose-200"
          }`}
        >
          <p className="text-sm font-semibold">{toastMsg.message}</p>
          <button onClick={() => setToastMsg(null)} className="ml-2 text-current opacity-60 hover:opacity-100">
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
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <T>Live Metal Rate Feed</T>
            </p>
            <p className="text-[10px] text-muted-foreground">
              <T>Updated at</T> {goldRates.updatedAt} ({goldRates.currency})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Gold 24K: </span>
            <span className="font-bold text-sm text-yellow-600 dark:text-yellow-400">
              {formatCurrency(goldRates.rate24k)}/g
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Gold 22K: </span>
            <span className="font-bold text-sm text-yellow-600/80 dark:text-yellow-400/80">
              {formatCurrency(goldRates.rate22k)}/g
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Gold 18K: </span>
            <span className="font-bold text-sm text-yellow-700/70 dark:text-yellow-400/70">
              {formatCurrency(goldRates.rate18k)}/g
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Silver 999: </span>
            <span className="font-bold text-sm text-slate-400">
              {formatCurrency(goldRates.silver)}/g
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
            <T>Procure raw metals, issue materials to artisans, and monitor loss margins.</T>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {saving && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pr-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              <span>
                <T>Saving changes...</T>
              </span>
            </div>
          )}
          <Button
            variant="outline"
            className="border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 bg-white dark:bg-gray-900"
            onClick={() => setProcureModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            <T>Procure Bullion</T>
          </Button>
          <Button
            data-tour="supply-add-karigar"
            variant="outline"
            className="border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 bg-white dark:bg-gray-900"
            onClick={() => setAddKarigarModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            <T>Add Karigar</T>
          </Button>
          <Button
            data-tour="supply-add-job"
            variant="outline"
            className="border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 bg-white dark:bg-gray-900"
            onClick={() => setAddJobModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            <T>Add Job</T>
          </Button>
          <Button
            className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
            onClick={() => {
              setAllotForm((p) => ({ ...p, workshopId: workshops[0]?.id || "" }));
              setAllotModalOpen(true);
            }}
          >
            <ArrowUpRight className="h-4 w-4 mr-1" />
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
                    <T>Asset value of raw 24K gold and silver bullion currently in vault.</T>
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
                    <span className="text-xs text-muted-foreground">grams</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    <T>Raw precious metals issued to Karigars currently in active fabrication.</T>
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
                    <T>Labor charges pending clearance upon receipt of hallmarked finished stock.</T>
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
                    <T>Unfinished raw metal grains and bars currently available for workshop allotment.</T>
                  </CardDescription>
                </div>
                <Button
                  data-tour="supply-add-material"
                  size="sm"
                  variant="outline"
                  className="border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                  onClick={() => setAddMaterialModalOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
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
                      Purity: 99.9%
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
                      Hallmarked
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
                      Ag 99.9%
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
                          <p className="text-xs text-muted-foreground font-medium">{mat.label}</p>
                          <p className="text-lg font-bold mt-1 text-amber-500">
                            {(vaultReserves[mat.vaultKey] || 0).toFixed(2)} g
                          </p>
                        </div>
                        <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs">
                          Custom
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
                        <T>Vault is empty. Procure raw bullion to start issuing metals to your Karigars.</T>
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Karigar Ledgers + Jobs */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Karigar Ledger Table */}
              <Card data-tour="supply-ledger" className="lg:col-span-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      <T>Artisan (Karigar) Balances & Wastage</T>
                    </CardTitle>
                    <CardDescription>
                      <T>Tracks metal weight issued to workshops vs finished metal weights returned.</T>
                    </CardDescription>
                  </div>
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder={t("Search artisans...")}
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      className="pl-8 text-xs h-8 rounded-lg border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
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
                          <T>Register your first Karigar to start tracking workshop metal flows, wastage margins, and outstanding fabrication balances.</T>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800/40 dark:text-amber-400"
                        onClick={() => setAddKarigarModalOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        <T>Register First Karigar</T>
                      </Button>
                    </div>
                  ) : (
                    <table className="w-full text-sm border-collapse text-left">
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
                          <th className="py-2.5 px-3 font-semibold text-right">
                            <T>Wage Due</T>
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
                                <p className="font-semibold text-gray-900 dark:text-gray-100">{w.artisan}</p>
                                <p className="text-xs text-muted-foreground">
                                  {w.name} &middot; {w.location}
                                </p>
                                {(w.phone || w.email) && (
                                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                    {w.phone && (
                                      <span className="flex items-center gap-0.5">
                                        <Phone className="h-2.5 w-2.5" /> {w.phone}
                                      </span>
                                    )}
                                    {w.email && (
                                      <span className="flex items-center gap-0.5">
                                        <Mail className="h-2.5 w-2.5" /> {w.email}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 font-medium text-gray-900 dark:text-gray-100">
                                {w.metalIssued.toFixed(1)}
                              </td>
                              <td className="py-3 px-3">{w.metalReturned.toFixed(1)}</td>
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
                                  variant={w.outstandingBalance > 0 ? "outline" : "secondary"}
                                  className={
                                    w.outstandingBalance > 0
                                      ? "border-amber-500/25 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                                      : ""
                                  }
                                >
                                  {w.outstandingBalance.toFixed(1)} g
                                </Badge>
                              </td>
                              <td className="py-3 px-3 font-bold text-right text-gray-900 dark:text-gray-100">
                                {formatCurrency(w.wageDue)}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center justify-center gap-1">
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

              {/* Jobs and Steps checklists */}
              <Card data-tour="supply-pipeline" className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    <T>Artisan Fabrication Pipeline</T>
                  </CardTitle>
                  <CardDescription>
                    <T>Active custom jobs on the workbench. Click checklist stages to record fabrication milestones.</T>
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
                          <T>Create a new job to start tracking fabrication progress through casting, filing, setting, polishing, and hallmarking stages.</T>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800/40 dark:text-blue-400"
                        onClick={() => setAddJobModalOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        <T>Create First Job</T>
                      </Button>
                    </div>
                  ) : (
                    jobs.map((j) => (
                      <div
                        key={j.id}
                        className="p-3 border dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-800/20 space-y-3"
                      >
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div>
                            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{j.product}</p>
                            <p className="text-xs text-muted-foreground">{j.artisan}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/25 text-[10px]">
                              {j.status}
                            </Badge>
                            <button
                              onClick={() => {
                                setEditJobForm({ ...j });
                                setEditJobModalOpen(true);
                              }}
                              className="p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600 dark:text-amber-400 transition-colors"
                              title={t("Edit Job")}
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => setDeleteJobId(j.id)}
                              className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 dark:text-rose-400 transition-colors"
                              title={t("Delete Job")}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* Horizontal steps checkboxes */}
                        <div className="grid grid-cols-5 gap-1 text-[10px] text-center pt-2">
                          <button
                            type="button"
                            onClick={() => toggleJobStep(j.id, "casting")}
                            className={`py-1.5 rounded-lg border font-medium ${
                              j.steps.casting
                                ? "bg-amber-500 border-amber-500 text-white"
                                : "border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            Cast
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleJobStep(j.id, "filing")}
                            className={`py-1.5 rounded-lg border font-medium ${
                              j.steps.filing
                                ? "bg-amber-500 border-amber-500 text-white"
                                : "border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            File
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleJobStep(j.id, "setting")}
                            className={`py-1.5 rounded-lg border font-medium ${
                              j.steps.setting
                                ? "bg-amber-500 border-amber-500 text-white"
                                : "border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            Set
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleJobStep(j.id, "polishing")}
                            className={`py-1.5 rounded-lg border font-medium ${
                              j.steps.polishing
                                ? "bg-amber-500 border-amber-500 text-white"
                                : "border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            Polish
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleJobStep(j.id, "hallmark")}
                            className={`py-1.5 rounded-lg border font-medium ${
                              j.steps.hallmark
                                ? "bg-emerald-500 border-emerald-500 text-white animate-pulse"
                                : "border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            HUID
                          </button>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
                          <span>
                            <T>Gross Weight</T>: {j.grossWeight} g
                          </span>
                          <span>{j.updatedAt}</span>
                        </div>
                      </div>
                    ))
                  )}
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
              <button onClick={() => setAllotModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              <T>Allot raw metal from vault directly into the artisan float ledger balance.</T>
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Select Workshop/Artisan</T>
                </Label>
                <Select
                  value={allotForm.workshopId}
                  onValueChange={(val) => setAllotForm((p) => ({ ...p, workshopId: val }))}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                    <SelectValue />
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
                  onValueChange={(val) => setAllotForm((p) => ({ ...p, metalType: val }))}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    {allMetals.map((m) => (
                      <SelectItem key={m.key} value={m.key}>
                        {m.label}
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
                  onChange={(e) => setAllotForm((p) => ({ ...p, weight: e.target.value }))}
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
              <button onClick={() => setProcureModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              <T>Log wholesale bullion grains purchase, adding raw materials balance to the safe vault reserves.</T>
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Metal Material</T>
                </Label>
                <Select
                  value={procureForm.metalType}
                  onValueChange={(val) => setProcureForm((p) => ({ ...p, metalType: val }))}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    {allMetals.map((m) => (
                      <SelectItem key={m.key} value={m.key}>
                        {m.label}
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
                  onChange={(e) => setProcureForm((p) => ({ ...p, weight: e.target.value }))}
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
              <button onClick={() => setAddMaterialModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              <T>Register a custom material type (e.g. Platinum, Rose Gold 14K, Palladium) to track in your vault and issue to artisans.</T>
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Material Name *</T>
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Platinum 950"
                  value={newMaterialForm.label}
                  onChange={(e) => setNewMaterialForm((p) => ({ ...p, label: e.target.value }))}
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
              <button onClick={() => setAddKarigarModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              <T>Register a new artisan ledger to start tracking issued raw metals and labor charges.</T>
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Artisan Name *</T>
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Shyam Verma"
                  value={karigarForm.artisan}
                  onChange={(e) => setKarigarForm((p) => ({ ...p, artisan: e.target.value }))}
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Workshop Name *</T>
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Verma Filigree Lab"
                  value={karigarForm.name}
                  onChange={(e) => setKarigarForm((p) => ({ ...p, name: e.target.value }))}
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Location</T>
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Varanasi, UP"
                  value={karigarForm.location}
                  onChange={(e) => setKarigarForm((p) => ({ ...p, location: e.target.value }))}
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
                    placeholder="+91 98765 43210"
                    value={karigarForm.phone}
                    onChange={(e) => setKarigarForm((p) => ({ ...p, phone: e.target.value }))}
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
                    value={karigarForm.email}
                    onChange={(e) => setKarigarForm((p) => ({ ...p, email: e.target.value }))}
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
                    onChange={(e) => setKarigarForm((p) => ({ ...p, wastageLimit: e.target.value }))}
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
                    onChange={(e) => setKarigarForm((p) => ({ ...p, wageRatePerGram: e.target.value }))}
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
                  onChange={(e) => setEditKarigarForm((p) => (p ? { ...p, artisan: e.target.value } : p))}
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Workshop Name</T>
                </Label>
                <Input
                  value={editKarigarForm.name}
                  onChange={(e) => setEditKarigarForm((p) => (p ? { ...p, name: e.target.value } : p))}
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Location</T>
                </Label>
                <Input
                  value={editKarigarForm.location}
                  onChange={(e) => setEditKarigarForm((p) => (p ? { ...p, location: e.target.value } : p))}
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
                    placeholder="+91 98765 43210"
                    value={editKarigarForm.phone || ""}
                    onChange={(e) => setEditKarigarForm((p) => (p ? { ...p, phone: e.target.value } : p))}
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
                    value={editKarigarForm.email || ""}
                    onChange={(e) => setEditKarigarForm((p) => (p ? { ...p, email: e.target.value } : p))}
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
                      setEditKarigarForm((p) => (p ? { ...p, wastageLimit: parseFloat(e.target.value) || 0 } : p))
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
                      setEditKarigarForm((p) => (p ? { ...p, wageRatePerGram: parseFloat(e.target.value) || 0 } : p))
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
              <T>This will permanently remove this artisan from the ledger. This action cannot be undone.</T>
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
              <button onClick={() => setAddJobModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              <T>Register a new custom fabrication job and assign it to an artisan workshop.</T>
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Product / Piece Name *</T>
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. 22K Traditional Bridal Choker"
                  value={jobForm.product}
                  onChange={(e) => setJobForm((p) => ({ ...p, product: e.target.value }))}
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Artisan / Workshop *</T>
                </Label>
                {workshops.length > 0 ? (
                  <Select value={jobForm.artisan} onValueChange={(val) => setJobForm((p) => ({ ...p, artisan: val }))}>
                    <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                      <SelectValue placeholder={t("Select artisan...")} />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                      {workshops.map((w) => (
                        <SelectItem key={w.id} value={`${w.artisan} (${w.name})`}>
                          {w.artisan} ({w.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="text"
                    placeholder="e.g. Rakesh Kumar (Patna Goldsmiths)"
                    value={jobForm.artisan}
                    onChange={(e) => setJobForm((p) => ({ ...p, artisan: e.target.value }))}
                    className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                  />
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Gross Weight (grams)</T>
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 45.5"
                  value={jobForm.grossWeight}
                  onChange={(e) => setJobForm((p) => ({ ...p, grossWeight: e.target.value }))}
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
                  onChange={(e) => setEditJobForm((p) => (p ? { ...p, product: e.target.value } : p))}
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Artisan</T>
                </Label>
                <Input
                  value={editJobForm.artisan}
                  onChange={(e) => setEditJobForm((p) => (p ? { ...p, artisan: e.target.value } : p))}
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-700 dark:text-gray-300">
                  <T>Gross Weight (grams)</T>
                </Label>
                <Input
                  type="number"
                  value={editJobForm.grossWeight}
                  onChange={(e) =>
                    setEditJobForm((p) => (p ? { ...p, grossWeight: parseFloat(e.target.value) || 0 } : p))
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

      {/* 9. Delete Job Confirmation */}
      {deleteJobId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6 text-rose-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              <T>Delete Fabrication Job?</T>
            </h3>
            <p className="text-sm text-muted-foreground">
              <T>This will permanently remove this job from the fabrication pipeline. This action cannot be undone.</T>
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
                <T>Delete Job</T>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
