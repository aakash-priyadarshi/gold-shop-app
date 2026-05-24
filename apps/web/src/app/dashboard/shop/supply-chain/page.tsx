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
import { materialsApi } from "@/lib/api";
import { getMobileMarketParams } from "@/lib/mobileCurrency";
import { useT } from "@/providers/translation-provider";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Hammer,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Mock Workshops and Artisans data
const INITIAL_WORKSHOPS = [
  {
    id: "ws-1",
    name: "Patna Goldsmiths",
    artisan: "Rakesh Kumar",
    location: "Patna, Bihar",
    rating: 4.9,
    metalIssued: 350.0,
    metalReturned: 345.2,
    wastagePercent: 0.95,
    wastageLimit: 1.0,
    wageRatePerGram: 180,
    outstandingBalance: 4.8, // 350.0 - 345.2
    wageDue: 62100, // 345.2 * 180
  },
  {
    id: "ws-2",
    name: "Butwal Casting House",
    artisan: "Sanjay Shakya",
    location: "Butwal, Nepal",
    rating: 4.8,
    metalIssued: 500.0,
    metalReturned: 494.5,
    wastagePercent: 1.1,
    wastageLimit: 1.2,
    wageRatePerGram: 220,
    outstandingBalance: 5.5,
    wageDue: 108790,
  },
  {
    id: "ws-3",
    name: "Zaveri Filigree Lab",
    artisan: "Amit Shah",
    location: "Zaveri Bazaar, Mumbai",
    rating: 5.0,
    metalIssued: 150.0,
    metalReturned: 149.1,
    wastagePercent: 0.6,
    wastageLimit: 0.8,
    wageRatePerGram: 350,
    outstandingBalance: 0.9,
    wageDue: 52185,
  },
];

const INITIAL_JOBS = [
  {
    id: "job-101",
    product: "22K Traditional Bridal Choker",
    artisan: "Rakesh Kumar (Patna Goldsmiths)",
    grossWeight: 45.5,
    status: "Filing",
    steps: {
      casting: true,
      filing: true,
      setting: false,
      polishing: false,
      hallmark: false,
    },
    updatedAt: "10 mins ago",
  },
  {
    id: "job-102",
    product: "18K Diamond Solitaire Engagement Ring",
    artisan: "Amit Shah (Zaveri Filigree Lab)",
    grossWeight: 5.2,
    status: "Stone Setting",
    steps: {
      casting: true,
      filing: true,
      setting: true,
      polishing: false,
      hallmark: false,
    },
    updatedAt: "2 hrs ago",
  },
  {
    id: "job-103",
    product: "999 Silver Heritage Filigree Jug",
    artisan: "Sanjay Shakya (Butwal Casting House)",
    grossWeight: 820.0,
    status: "Polishing",
    steps: {
      casting: true,
      filing: true,
      setting: true,
      polishing: true,
      hallmark: false,
    },
    updatedAt: "Just now",
  },
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
    updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    changePercent: 0.85,
  });
  const ratesRef = useRef(false);

  // Vault Reserves State (Grams)
  const [vaultReserves, setVaultReserves] = useState({
    goldGrains24k: 840.5,
    goldBars24k: 400.0,
    silverBullion999: 4500.0,
  });

  // Workshops & Jobs State
  const [workshops, setWorkshops] = useState(INITIAL_WORKSHOPS);
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [filterQuery, setFilterQuery] = useState("");

  // Action Modals/Forms State
  const [allotModalOpen, setAllotModalOpen] = useState(false);
  const [allotForm, setAllotForm] = useState({
    workshopId: "ws-1",
    metalType: "GOLD_24K",
    weight: "",
  });
  
  const [procureModalOpen, setProcureModalOpen] = useState(false);
  const [procureForm, setProcureForm] = useState({
    metalType: "GOLD_24K",
    weight: "",
  });

  // Read metal rate function
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

  useEffect(() => {
    fetchRates();
    const interval = setInterval(() => {
      ratesRef.current = false;
      fetchRates();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  // Asset Value Math helper
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

  // Calculations
  const totalGoldGrams = vaultReserves.goldGrains24k + vaultReserves.goldBars24k;
  const totalVaultGoldValue = totalGoldGrams * goldRates.rate24k;
  const totalVaultSilverValue = vaultReserves.silverBullion999 * goldRates.silver;
  const grandVaultAssetValuation = totalVaultGoldValue + totalVaultSilverValue;

  const totalOutstandingKarigarGrams = workshops.reduce((sum, w) => sum + w.outstandingBalance, 0);
  const totalWagesDue = workshops.reduce((sum, w) => sum + w.wageDue, 0);

  // Allotment handler
  const handleAllot = () => {
    const wt = parseFloat(allotForm.weight);
    if (isNaN(wt) || wt <= 0) return;

    if (allotForm.metalType === "GOLD_24K") {
      if (vaultReserves.goldGrains24k < wt) {
        alert("Insufficient grains in vault!");
        return;
      }
      setVaultReserves((prev) => ({
        ...prev,
        goldGrains24k: Number((prev.goldGrains24k - wt).toFixed(2)),
      }));
    } else {
      if (vaultReserves.silverBullion999 < wt) {
        alert("Insufficient silver reserves in vault!");
        return;
      }
      setVaultReserves((prev) => ({
        ...prev,
        silverBullion999: Number((prev.silverBullion999 - wt).toFixed(2)),
      }));
    }

    setWorkshops((prev) =>
      prev.map((w) =>
        w.id === allotForm.workshopId
          ? {
              ...w,
              metalIssued: Number((w.metalIssued + wt).toFixed(2)),
              outstandingBalance: Number((w.outstandingBalance + wt).toFixed(2)),
            }
          : w
      )
    );

    setAllotForm((prev) => ({ ...prev, weight: "" }));
    setAllotModalOpen(false);
  };

  // Procure handler
  const handleProcure = () => {
    const wt = parseFloat(procureForm.weight);
    if (isNaN(wt) || wt <= 0) return;

    if (procureForm.metalType === "GOLD_24K") {
      setVaultReserves((prev) => ({
        ...prev,
        goldGrains24k: Number((prev.goldGrains24k + wt).toFixed(2)),
      }));
    } else {
      setVaultReserves((prev) => ({
        ...prev,
        silverBullion999: Number((prev.silverBullion999 + wt).toFixed(2)),
      }));
    }

    setProcureForm((prev) => ({ ...prev, weight: "" }));
    setProcureModalOpen(false);
  };

  // Step click simulator
  const toggleJobStep = (jobId: string, stepKey: string) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j;
        // @ts-ignore
        const nextSteps = { ...j.steps, [stepKey]: !j.steps[stepKey] };
        
        // Derive Status
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
      })
    );
  };

  const filteredWorkshops = workshops.filter((w) =>
    w.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    w.artisan.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Premium Rate Ticker */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4 backdrop-blur-md">
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
            <span className="font-bold text-sm text-yellow-600/80">
              {formatCurrency(goldRates.rate22k)}/g
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Gold 18K: </span>
            <span className="font-bold text-sm text-yellow-700/70">
              {formatCurrency(goldRates.rate18k)}/g
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Silver 999: </span>
            <span className="font-bold text-sm text-slate-400">
              {formatCurrency(goldRates.silver)}/g
            </span>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3" />
            +{goldRates.changePercent}%
          </Badge>
        </div>
      </div>

      {/* Header and Quick stats */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Hammer className="h-6 w-6 text-amber-500" />
            <T>Karigar & Bullion Supply Chain</T>
          </h1>
          <p className="text-muted-foreground mt-0.5">
            <T>Procure raw metals, issue materials to artisans, and monitor loss margins.</T>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
            onClick={() => setProcureModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            <T>Procure Bullion</T>
          </Button>
          <Button
            className="bg-amber-500 text-white hover:bg-amber-600"
            onClick={() => setAllotModalOpen(true)}
          >
            <ArrowUpRight className="h-4 w-4 mr-1" />
            <T>Issue Gold Grains</T>
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
        {/* Core Bullion Vault Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/20 dark:to-gray-900 border-yellow-200/50">
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
                <T>Asset value of raw 24K gold and silver bullion current in vault.</T>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900 border-gray-150 dark:border-gray-800">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardDescription className="uppercase tracking-wider text-xs font-semibold">
                  <T>Active Allotment Float</T>
                </CardDescription>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold">
                {totalOutstandingKarigarGrams.toFixed(1)} <span className="text-xs text-muted-foreground">grams</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                <T>Raw precious metals issued to Karigars currently in active fabrication.</T>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-900 border-gray-150 dark:border-gray-800">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardDescription className="uppercase tracking-wider text-xs font-semibold">
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

        {/* Vault Grains & Bars balances */}
        <Card className="bg-white dark:bg-gray-900 border-gray-150 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              <T>Vault Physical Reserve Inventory</T>
            </CardTitle>
            <CardDescription>
              <T>Unfinished raw metal grains and bars currently available for workshop allotment.</T>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-850/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium"><T>24K Gold Grains</T></p>
                <p className="text-lg font-bold mt-1 text-yellow-600 dark:text-yellow-400">{vaultReserves.goldGrains24k.toFixed(2)} g</p>
              </div>
              <Badge className="bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 text-xs">Purity: 99.9%</Badge>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-850/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium"><T>24K Gold Cast Bars</T></p>
                <p className="text-lg font-bold mt-1 text-yellow-600 dark:text-yellow-400">{vaultReserves.goldBars24k.toFixed(2)} g</p>
              </div>
              <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs">Hallmarked</Badge>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-850/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium"><T>999 Silver Scrap/Grain</T></p>
                <p className="text-lg font-bold mt-1 text-slate-400">{vaultReserves.silverBullion999.toFixed(2)} g</p>
              </div>
              <Badge className="bg-slate-500/10 text-slate-600 border border-slate-500/20 text-xs">Ag 99.9%</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Karigar Ledgers */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 bg-white dark:bg-gray-900 border-gray-150 dark:border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base font-semibold"><T>Artisan (Karigar) Balances & Wastage</T></CardTitle>
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
                  className="pl-8 text-xs h-8 rounded-lg"
                />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm border-collapse text-left">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground bg-gray-50 dark:bg-gray-850/50">
                    <th className="py-2.5 px-3 font-semibold"><T>Karigar & Workshop</T></th>
                    <th className="py-2.5 px-3 font-semibold"><T>Issued (g)</T></th>
                    <th className="py-2.5 px-3 font-semibold"><T>Returned (g)</T></th>
                    <th className="py-2.5 px-3 font-semibold"><T>Wastage %</T></th>
                    <th className="py-2.5 px-3 font-semibold"><T>Float Bal (g)</T></th>
                    <th className="py-2.5 px-3 font-semibold text-right"><T>Wage Due</T></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredWorkshops.map((w) => {
                    const isExceeded = w.wastagePercent > w.wastageLimit;
                    return (
                      <tr key={w.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/20">
                        <td className="py-3 px-3">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{w.artisan}</p>
                          <p className="text-xs text-muted-foreground">{w.name} &middot; {w.location}</p>
                        </td>
                        <td className="py-3 px-3 font-medium">{w.metalIssued.toFixed(1)}</td>
                        <td className="py-3 px-3">{w.metalReturned.toFixed(1)}</td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 font-semibold text-xs ${isExceeded ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {w.wastagePercent.toFixed(2)}%
                            <span className="text-[10px] text-muted-foreground">({t("Limit")} {w.wastageLimit}%)</span>
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={w.outstandingBalance > 0 ? "outline" : "secondary"} className={w.outstandingBalance > 0 ? "border-amber-500/25 bg-amber-500/5 text-amber-600" : ""}>
                            {w.outstandingBalance.toFixed(1)} g
                          </Badge>
                        </td>
                        <td className="py-3 px-3 font-bold text-right text-gray-900 dark:text-gray-100">
                          {formatCurrency(w.wageDue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Jobs and Steps checklists */}
          <Card className="bg-white dark:bg-gray-900 border-gray-150 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-base font-semibold"><T>Artisan Fabrication Pipeline</T></CardTitle>
              <CardDescription>
                <T>Active custom jobs on the workbench. Click checklist stages to record fabrication milestones.</T>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {jobs.map((j) => (
                <div key={j.id} className="p-3 border rounded-xl bg-gray-50/50 dark:bg-gray-850/10 space-y-3">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{j.product}</p>
                      <p className="text-xs text-muted-foreground">{j.artisan}</p>
                    </div>
                    <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/25 text-[10px]">
                      {j.status}
                    </Badge>
                  </div>

                  {/* Horizontal steps checkboxes */}
                  <div className="grid grid-cols-5 gap-1 text-[10px] text-center pt-2">
                    <button
                      type="button"
                      onClick={() => toggleJobStep(j.id, "casting")}
                      className={`py-1.5 rounded-lg border font-medium ${j.steps.casting ? "bg-amber-500 border-amber-500 text-white" : "border-gray-200 dark:border-gray-800 hover:bg-gray-100"}`}
                    >
                      Cast
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleJobStep(j.id, "filing")}
                      className={`py-1.5 rounded-lg border font-medium ${j.steps.filing ? "bg-amber-500 border-amber-500 text-white" : "border-gray-200 dark:border-gray-800 hover:bg-gray-100"}`}
                    >
                      File
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleJobStep(j.id, "setting")}
                      className={`py-1.5 rounded-lg border font-medium ${j.steps.setting ? "bg-amber-500 border-amber-500 text-white" : "border-gray-200 dark:border-gray-800 hover:bg-gray-100"}`}
                    >
                      Set
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleJobStep(j.id, "polishing")}
                      className={`py-1.5 rounded-lg border font-medium ${j.steps.polishing ? "bg-amber-500 border-amber-500 text-white" : "border-gray-200 dark:border-gray-800 hover:bg-gray-100"}`}
                    >
                      Polish
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleJobStep(j.id, "hallmark")}
                      className={`py-1.5 rounded-lg border font-medium ${j.steps.hallmark ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-200 dark:border-gray-800 hover:bg-gray-100"}`}
                    >
                      HUID
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
                    <span><T>Gross Weight</T>: {j.grossWeight} g</span>
                    <span>{j.updatedAt}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </FeatureGate>

      {/* ─── MODALS ─── */}
      {/* 1. Allot modal */}
      {allotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100"><T>Issue Bullion to Workshop</T></h3>
            <p className="text-xs text-muted-foreground">
              <T>Allot raw metal from vault directly into the artisan float ledger balance.</T>
            </p>
            
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label><T>Select Workshop/Artisan</T></Label>
                <Select
                  value={allotForm.workshopId}
                  onValueChange={(val) => setAllotForm((p) => ({ ...p, workshopId: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workshops.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.artisan} ({w.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label><T>Metal Material</T></Label>
                <Select
                  value={allotForm.metalType}
                  onValueChange={(val) => setAllotForm((p) => ({ ...p, metalType: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOLD_24K">Gold grains (24K)</SelectItem>
                    <SelectItem value="SILVER_999">Silver bullion (999)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label><T>Weight (grams)</T></Label>
                <Input
                  type="number"
                  placeholder="e.g. 50"
                  value={allotForm.weight}
                  onChange={(e) => setAllotForm((p) => ({ ...p, weight: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setAllotModalOpen(false)}><T>Cancel</T></Button>
              <Button className="bg-amber-500 text-white hover:bg-amber-600" size="sm" onClick={handleAllot}><T>Issue Metal</T></Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Procure modal */}
      {procureModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100"><T>Procure Raw Bullion</T></h3>
            <p className="text-xs text-muted-foreground">
              <T>Log wholesale bullion grains purchase, adding raw materials balance to the safe vault reserves.</T>
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label><T>Metal Material</T></Label>
                <Select
                  value={procureForm.metalType}
                  onValueChange={(val) => setProcureForm((p) => ({ ...p, metalType: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOLD_24K">Gold grains (24K)</SelectItem>
                    <SelectItem value="SILVER_999">Silver bullion (999)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label><T>Weight (grams)</T></Label>
                <Input
                  type="number"
                  placeholder="e.g. 100"
                  value={procureForm.weight}
                  onChange={(e) => setProcureForm((p) => ({ ...p, weight: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setProcureModalOpen(false)}><T>Cancel</T></Button>
              <Button className="bg-amber-500 text-white hover:bg-amber-600" size="sm" onClick={handleProcure}><T>Add to Vault</T></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
