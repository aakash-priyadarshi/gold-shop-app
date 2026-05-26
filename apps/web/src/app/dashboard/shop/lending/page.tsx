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
import { Loader2, Coins, Plus, Scale, Trash2, CheckCircle2, AlertTriangle, Calendar, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";

interface PawnedItem {
  name: string;
  purity: "24K" | "22K" | "18K" | "14K" | "SILVER";
  grossWeight: number;
  netWeight: number;
}

interface GoldLoan {
  id: string;
  loanNumber: string;
  customerName: string;
  customerPhone: string;
  principal: number;
  interestRate: number; // in %
  rateType: "MONTHLY" | "ANNUAL";
  interestType: "SIMPLE" | "COMPOUND";
  compoundFrequency?: "MONTHLY" | "QUARTERLY" | "ANNUALLY";
  pawnedItems: PawnedItem[];
  status: "ACTIVE" | "REDEEMED" | "DEFAULTED";
  loanDate: string; // YYYY-MM-DD
  redeemedDate?: string;
}

const DEFAULT_LOANS: GoldLoan[] = [
  {
    id: "loan-1",
    loanNumber: "GV-2026-001",
    customerName: "Rajesh Prasad",
    customerPhone: "+91 98765 43210",
    principal: 25000,
    interestRate: 1.5,
    rateType: "MONTHLY",
    interestType: "SIMPLE",
    pawnedItems: [
      { name: "22K Gold Mens Signet Ring", purity: "22K", grossWeight: 8.5, netWeight: 8.0 }
    ],
    status: "ACTIVE",
    loanDate: "2026-02-26" // 3 months ago relative to May 26
  },
  {
    id: "loan-2",
    loanNumber: "GV-2026-002",
    customerName: "Gita Shrestha",
    customerPhone: "+977 98412 34567",
    principal: 70000,
    interestRate: 2.0,
    rateType: "MONTHLY",
    interestType: "COMPOUND",
    compoundFrequency: "MONTHLY",
    pawnedItems: [
      { name: "22K Gold Wedding Bangles (Pair)", purity: "22K", grossWeight: 22.4, netWeight: 22.0 }
    ],
    status: "ACTIVE",
    loanDate: "2026-04-26" // 1 month ago relative to May 26
  }
];

export default function GirviLendingPage() {
  return (
    <ShopGuard>
      <DashboardLayout>
        <GirviLendingContent />
      </DashboardLayout>
    </ShopGuard>
  );
}

function GirviLendingContent() {
  const { user, refreshUser } = useAuth();
  const { hasFeature, planName, loading: featuresLoading } = useFeatures();
  const t = useT();

  // Spot Rates State
  const [goldRates, setGoldRates] = useState({
    rate24k: 7250,
    rate22k: 6645,
    rate18k: 5437,
    silver: 85,
    currency: "INR",
    updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });
  const ratesRef = useRef(false);

  // Core Ledger States
  const [loans, setLoans] = useState<GoldLoan[]>(DEFAULT_LOANS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "REDEEMED" | "DEFAULTED">("ALL");

  // Add Loan Modal States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newLoan, setNewLoan] = useState({
    customerName: "",
    customerPhone: "",
    principal: "",
    interestRate: "1.5",
    rateType: "MONTHLY" as "MONTHLY" | "ANNUAL",
    interestType: "SIMPLE" as "SIMPLE" | "COMPOUND",
    compoundFrequency: "MONTHLY" as "MONTHLY" | "QUARTERLY" | "ANNUALLY",
    loanDate: new Date().toISOString().split("T")[0],
  });
  const [pawnedItems, setPawnedItems] = useState<PawnedItem[]>([
    { name: "", purity: "22K", grossWeight: 0, netWeight: 0 }
  ]);

  // Calculator Sandbox States
  const [calcForm, setCalcForm] = useState({
    principal: "50000",
    rate: "2.0",
    rateType: "MONTHLY" as "MONTHLY" | "ANNUAL",
    interestType: "SIMPLE" as "SIMPLE" | "COMPOUND",
    compoundFrequency: "MONTHLY" as "MONTHLY" | "QUARTERLY" | "ANNUALLY",
    months: "6",
  });

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
      });
    } catch {
      // fallback
    } finally {
      ratesRef.current = false;
    }
  }, [user?.shop]);

  // Load from DB
  const loadDatabaseConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await shopsApi.getSettings();
      const s = res.data ?? res;
      const dbConfig = s.bankAccountDetails?.girviLending;
      if (dbConfig && Array.isArray(dbConfig.loans)) {
        setLoans(dbConfig.loans);
      }
    } catch (err) {
      console.error("Failed to load Girvi lending records from database:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    loadDatabaseConfig();
  }, [fetchRates, loadDatabaseConfig]);

  // Persist State
  const persistLoans = async (updatedLoans: GoldLoan[]) => {
    setSaving(true);
    try {
      const currentSettingsRes = await shopsApi.getSettings();
      const currentSettings = currentSettingsRes.data ?? currentSettingsRes;
      const bankDetails = currentSettings.bankAccountDetails || {};
      
      const updatedBankAccountDetails = {
        ...bankDetails,
        girviLending: {
          loans: updatedLoans,
        }
      };

      await shopsApi.updateSettings({
        bankAccountDetails: updatedBankAccountDetails
      });
      await refreshUser();
    } catch (err) {
      console.error("Failed to persist lending ledger:", err);
      alert("Failed to save loan ledger!");
    } finally {
      setSaving(false);
    }
  };

  // Melt Value Calculator (Live spot rate evaluation)
  const calculateMeltValue = useCallback((item: PawnedItem) => {
    let purityRatio = 0.0;
    let spotPrice = goldRates.rate24k;

    if (item.purity === "24K") purityRatio = 1.0;
    else if (item.purity === "22K") purityRatio = 22 / 24;
    else if (item.purity === "18K") purityRatio = 18 / 24;
    else if (item.purity === "14K") purityRatio = 14 / 24;
    else if (item.purity === "SILVER") {
      purityRatio = 0.999;
      spotPrice = goldRates.silver;
    }

    const netWeight = item.netWeight || 0;
    return Math.round(netWeight * spotPrice * purityRatio);
  }, [goldRates]);

  // General Currency formatting
  const formatCurrency = useCallback((amount: number): string => {
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
  }, [goldRates.currency]);

  // Calculate accumulated interest & elapsed days dynamically
  const getLoanComputations = useCallback((loan: GoldLoan) => {
    const start = new Date(loan.loanDate);
    const end = loan.status === "ACTIVE" ? new Date() : new Date(loan.redeemedDate || loan.loanDate);
    
    // Calculate difference in days
    const diffTime = Math.max(0, end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Convert rate
    let annualRate = loan.interestRate;
    if (loan.rateType === "MONTHLY") {
      annualRate = loan.interestRate * 12;
    }

    const tYears = diffDays / 365.25;
    let accruedInterest = 0;

    if (loan.interestType === "SIMPLE") {
      accruedInterest = loan.principal * (annualRate / 100) * tYears;
    } else {
      // Compound Interest
      let n = 12; // default monthly
      if (loan.compoundFrequency === "QUARTERLY") n = 4;
      else if (loan.compoundFrequency === "ANNUALLY") n = 1;
      
      accruedInterest = loan.principal * (Math.pow(1 + (annualRate / 100) / n, n * tYears) - 1);
    }

    const totalPayable = loan.principal + accruedInterest;
    return {
      daysElapsed: diffDays,
      interest: Math.round(accruedInterest),
      payable: Math.round(totalPayable)
    };
  }, []);

  // Sandbox calculator calculations
  const sandboxCalculations = useMemo(() => {
    const p = parseFloat(calcForm.principal) || 0;
    const r = parseFloat(calcForm.rate) || 0;
    const months = parseFloat(calcForm.months) || 0;
    
    let annualRate = r;
    if (calcForm.rateType === "MONTHLY") {
      annualRate = r * 12;
    }

    const tYears = months / 12;
    let interest = 0;

    if (calcForm.interestType === "SIMPLE") {
      interest = p * (annualRate / 100) * tYears;
    } else {
      let n = 12;
      if (calcForm.compoundFrequency === "QUARTERLY") n = 4;
      else if (calcForm.compoundFrequency === "ANNUALLY") n = 1;

      interest = p * (Math.pow(1 + (annualRate / 100) / n, n * tYears) - 1);
    }

    return {
      interest: Math.round(interest),
      total: Math.round(p + interest)
    };
  }, [calcForm]);

  // Pawn items melt value calculation
  const totalMeltValue = (pawnItems: PawnedItem[]) => {
    return pawnItems.reduce((sum, item) => sum + calculateMeltValue(item), 0);
  };

  // Add Item to Pawn Form
  const addPawnedItemInput = () => {
    setPawnedItems([...pawnedItems, { name: "", purity: "22K", grossWeight: 0, netWeight: 0 }]);
  };

  const removePawnedItemInput = (idx: number) => {
    if (pawnedItems.length <= 1) return;
    setPawnedItems(pawnedItems.filter((_, i) => i !== idx));
  };

  const updatePawnedItemInput = (idx: number, field: keyof PawnedItem, value: any) => {
    const updated = pawnedItems.map((item, i) => {
      if (i !== idx) return item;
      return { ...item, [field]: value };
    });
    setPawnedItems(updated);
  };

  // Submit New Loan
  const handleCreateLoan = async () => {
    const principalVal = parseFloat(newLoan.principal);
    if (!newLoan.customerName.trim()) return alert("Customer name is required!");
    if (isNaN(principalVal) || principalVal <= 0) return alert("Please enter a valid principal loan amount!");
    if (pawnedItems.some(item => !item.name.trim() || item.netWeight <= 0)) return alert("Please fill in all pawned item names and weights!");

    const loanId = "ln-" + Date.now();
    const loanNum = `GV-${new Date().getFullYear()}-${String(loans.length + 1).padStart(3, "0")}`;

    const createdLoan: GoldLoan = {
      id: loanId,
      loanNumber: loanNum,
      customerName: newLoan.customerName,
      customerPhone: newLoan.customerPhone,
      principal: principalVal,
      interestRate: parseFloat(newLoan.interestRate) || 1.5,
      rateType: newLoan.rateType,
      interestType: newLoan.interestType,
      compoundFrequency: newLoan.interestType === "COMPOUND" ? newLoan.compoundFrequency : undefined,
      pawnedItems: pawnedItems,
      status: "ACTIVE",
      loanDate: newLoan.loanDate
    };

    const updatedLoans = [createdLoan, ...loans];
    setLoans(updatedLoans);
    setAddModalOpen(false);
    
    // reset form
    setNewLoan({
      customerName: "",
      customerPhone: "",
      principal: "",
      interestRate: "1.5",
      rateType: "MONTHLY",
      interestType: "SIMPLE",
      compoundFrequency: "MONTHLY",
      loanDate: new Date().toISOString().split("T")[0],
    });
    setPawnedItems([{ name: "", purity: "22K", grossWeight: 0, netWeight: 0 }]);

    await persistLoans(updatedLoans);
  };

  // Redeem Loan
  const handleRedeemLoan = async (loanId: string) => {
    if (!confirm(t("Are you sure you want to record repayment and release pawned gold collateral?"))) return;
    const updatedLoans = loans.map((l) =>
      l.id === loanId
        ? { ...l, status: "REDEEMED" as const, redeemedDate: new Date().toISOString().split("T")[0] }
        : l
    );
    setLoans(updatedLoans);
    await persistLoans(updatedLoans);
  };

  // Forfeit/Default Loan
  const handleDefaultForfeit = async (loanId: string) => {
    if (!confirm(t("Are you sure you want to declare DEFAULT? This will forfeit pawned collateral gold and transfer items directly to your store stock vault."))) return;
    const updatedLoans = loans.map((l) =>
      l.id === loanId
        ? { ...l, status: "DEFAULTED" as const, redeemedDate: new Date().toISOString().split("T")[0] }
        : l
    );
    setLoans(updatedLoans);
    await persistLoans(updatedLoans);
  };

  const filteredLoans = loans.filter((l) => {
    const matchesSearch = l.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          l.loanNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Rate Feed Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <T>Girvi Live Valuation Index</T>
            </p>
            <p className="text-[10px] text-muted-foreground">
              <T>Pawn values feed synced to global spot rates</T> ({goldRates.currency})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Gold 22K (Standard Pawn): </span>
            <span className="font-bold text-sm text-yellow-600 dark:text-yellow-400">
              {formatCurrency(goldRates.rate22k)}/g
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

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Coins className="h-6 w-6 text-amber-500" />
            <T>Money Lending &amp; Gold Loans (Girvi)</T>
          </h1>
          <p className="text-muted-foreground mt-0.5">
            <T>Calculate compound interest, manage pawned gold collateral, and keep records securely.</T>
          </p>
        </div>
        <div className="flex gap-2">
          {saving && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pr-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              <span><T>Saving changes...</T></span>
            </div>
          )}
          <Button
            className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            <T>Create Gold Loan</T>
          </Button>
        </div>
      </div>

      <FeatureGate
        feature="invoicing" // map to invoicing to protect premium modules
        featureLabel="Gold Loan & Girvi Lending Module"
        hasFeature={hasFeature}
        planName={planName}
        loading={featuresLoading}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            <p className="text-xs text-muted-foreground"><T>Loading database loan ledger...</T></p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Ledger Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active Loans */}
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-gray-900 dark:text-gray-100"><T>Active Pawn Loan Ledgers</T></CardTitle>
                    <CardDescription><T>Search and manage pawned ornaments, redeem pledges, or handle forfeitures.</T></CardDescription>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-48">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder={t("Search loans...")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 text-xs h-9 rounded-lg border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                      <SelectTrigger className="h-9 w-28 text-xs border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                        <SelectItem value="ALL">All Loans</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="REDEEMED">Redeemed</SelectItem>
                        <SelectItem value="DEFAULTED">Defaulted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="px-0">
                  {filteredLoans.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Coins className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm"><T>No active loan ledgers found matching filters.</T></p>
                    </div>
                  ) : (
                    <div className="divide-y dark:divide-gray-800 border-t dark:border-gray-800">
                      {filteredLoans.map((loan) => {
                        const computations = getLoanComputations(loan);
                        const meltVal = totalMeltValue(loan.pawnedItems);
                        const ltvRatio = Math.round((loan.principal / meltVal) * 100);

                        return (
                          <div key={loan.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-850/10 space-y-3 transition-colors">
                            <div className="flex justify-between items-start flex-wrap gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">{loan.loanNumber}</span>
                                  <Badge className={
                                    loan.status === "ACTIVE" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                                    loan.status === "REDEEMED" ? "bg-green-500/10 text-green-600 border border-green-500/20" :
                                    "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                  } variant="outline">
                                    {loan.status}
                                  </Badge>
                                </div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">{loan.customerName}</p>
                                <p className="text-xs text-muted-foreground">{loan.customerPhone} &middot; <T>Issued</T>: {loan.loanDate}</p>
                              </div>

                              <div className="text-right">
                                <p className="text-xs text-muted-foreground uppercase font-medium tracking-wide"><T>Accrued Interest</T> ({computations.daysElapsed} days)</p>
                                <p className="font-bold text-sm text-yellow-600 dark:text-yellow-400">+{formatCurrency(computations.interest)}</p>
                                <p className="text-xs text-muted-foreground mt-0.5"><T>Principal</T>: {formatCurrency(loan.principal)}</p>
                              </div>
                            </div>

                            {/* Collateral details */}
                            <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-3 border dark:border-gray-800/50 flex flex-wrap justify-between items-center gap-4">
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide"><T>Pledged Gold Collateral</T></span>
                                {loan.pawnedItems.map((item, idx) => (
                                  <p key={idx} className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                                    💎 {item.name} ({item.purity}) &middot; {item.netWeight.toFixed(2)}g net
                                  </p>
                                ))}
                              </div>

                              <div className="flex gap-4">
                                <div className="text-right">
                                  <span className="text-[10px] text-muted-foreground uppercase block"><T>Est. Melt Value</T></span>
                                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(meltVal)}</span>
                                </div>
                                <div className="text-right border-l dark:border-gray-800 pl-4">
                                  <span className="text-[10px] text-muted-foreground uppercase block"><T>Risk LTV</T></span>
                                  <Badge className={
                                    ltvRatio > 80 ? "bg-red-500/10 text-red-600 border border-red-500/20" :
                                    ltvRatio > 65 ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20" :
                                    "bg-green-500/10 text-green-600 border border-green-500/20"
                                  } variant="outline">
                                    {ltvRatio}% LTV
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Operations */}
                            {loan.status === "ACTIVE" && (
                              <div className="flex justify-between items-center flex-wrap gap-2 pt-1.5">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span><T>Accruing interest at</T> <span className="font-semibold">{loan.interestRate}%</span> / {loan.rateType.toLowerCase()} ({loan.interestType.toLowerCase()})</span>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDefaultForfeit(loan.id)}
                                    className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 dark:border-rose-900/40 text-xs h-8"
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                                    <T>Liquidate Collateral</T>
                                  </Button>
                                  <Button
                                    onClick={() => handleRedeemLoan(loan.id)}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs h-8 font-semibold shadow flex items-center"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                    <T>Redeem &amp; Collect</T> ({formatCurrency(computations.payable)})
                                  </Button>
                                </div>
                              </div>
                            )}

                            {loan.status === "REDEEMED" && (
                              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5 font-medium pt-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <T>Repayment fully cleared and collateral gold returned back on</T> {loan.redeemedDate}
                              </p>
                            )}

                            {loan.status === "DEFAULTED" && (
                              <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium pt-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <T>Loan defaulted. Collateral gold forfeited and melted into store stock on</T> {loan.redeemedDate}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Sandbox Calculator Column */}
            <div className="space-y-6">
              <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <Scale className="h-5 w-5 text-amber-500" />
                    <T>Pawn Interest Calculator</T>
                  </CardTitle>
                  <CardDescription><T>Simulate interest rates, terms, and compounds instantly before drafting a loan agreement.</T></CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-gray-700 dark:text-gray-300"><T>Principal Loan Amount</T></Label>
                    <Input
                      type="number"
                      value={calcForm.principal}
                      onChange={(e) => setCalcForm(p => ({ ...p, principal: e.target.value }))}
                      className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-gray-700 dark:text-gray-300"><T>Rate (%)</T></Label>
                      <Input
                        type="number"
                        step="0.05"
                        value={calcForm.rate}
                        onChange={(e) => setCalcForm(p => ({ ...p, rate: e.target.value }))}
                        className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-gray-700 dark:text-gray-300"><T>Period</T></Label>
                      <Select value={calcForm.rateType} onValueChange={(val: any) => setCalcForm(p => ({ ...p, rateType: val }))}>
                        <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                          <SelectItem value="MONTHLY">Per Month</SelectItem>
                          <SelectItem value="ANNUAL">Per Annum</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-gray-700 dark:text-gray-300"><T>Interest Scheme</T></Label>
                      <Select value={calcForm.interestType} onValueChange={(val: any) => setCalcForm(p => ({ ...p, interestType: val }))}>
                        <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                          <SelectItem value="SIMPLE">Simple</SelectItem>
                          <SelectItem value="COMPOUND">Compound</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-gray-700 dark:text-gray-300"><T>Duration (months)</T></Label>
                      <Input
                        type="number"
                        value={calcForm.months}
                        onChange={(e) => setCalcForm(p => ({ ...p, months: e.target.value }))}
                        className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  {calcForm.interestType === "COMPOUND" && (
                    <div className="space-y-1">
                      <Label className="text-gray-700 dark:text-gray-300"><T>Compounding Cycle</T></Label>
                      <Select value={calcForm.compoundFrequency} onValueChange={(val: any) => setCalcForm(p => ({ ...p, compoundFrequency: val }))}>
                        <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                          <SelectItem value="ANNUALLY">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Calculator output */}
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2 mt-4">
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span><T>Total Accrued Interest</T></span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">+{formatCurrency(sandboxCalculations.interest)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold border-t dark:border-gray-850 pt-2 text-gray-900 dark:text-gray-100">
                      <span><T>Grand Repayment Total</T></span>
                      <span className="text-amber-600 dark:text-amber-400">{formatCurrency(sandboxCalculations.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </FeatureGate>

      {/* ─── CREATION DIALOG ─── */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5"><Coins className="h-5 w-5 text-amber-500" /><T>Draft New Gold Pawn Loan</T></h3>
            <p className="text-xs text-muted-foreground">
              <T>Fill in borrower particulars, establish interest rate metrics, and record pawned ornaments collateral.</T>
            </p>

            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300"><T>Borrower Name *</T></Label>
                  <Input
                    placeholder="e.g. Ramesh Chandra"
                    value={newLoan.customerName}
                    onChange={(e) => setNewLoan(p => ({ ...p, customerName: e.target.value }))}
                    className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300"><T>Phone Number</T></Label>
                  <Input
                    placeholder="e.g. +91 98765 01234"
                    value={newLoan.customerPhone}
                    onChange={(e) => setNewLoan(p => ({ ...p, customerPhone: e.target.value }))}
                    className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300"><T>Loan Principal *</T></Label>
                  <Input
                    type="number"
                    placeholder="25000"
                    value={newLoan.principal}
                    onChange={(e) => setNewLoan(p => ({ ...p, principal: e.target.value }))}
                    className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300"><T>Interest Rate (%)</T></Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={newLoan.interestRate}
                    onChange={(e) => setNewLoan(p => ({ ...p, interestRate: e.target.value }))}
                    className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300"><T>Period</T></Label>
                  <Select value={newLoan.rateType} onValueChange={(val: any) => setNewLoan(p => ({ ...p, rateType: val }))}>
                    <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                      <SelectItem value="MONTHLY">Per Month</SelectItem>
                      <SelectItem value="ANNUAL">Per Annum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300"><T>Interest Scheme</T></Label>
                  <Select value={newLoan.interestType} onValueChange={(val: any) => setNewLoan(p => ({ ...p, interestType: val }))}>
                    <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                      <SelectItem value="SIMPLE">Simple</SelectItem>
                      <SelectItem value="COMPOUND">Compound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300"><T>Loan Issue Date</T></Label>
                  <Input
                    type="date"
                    value={newLoan.loanDate}
                    onChange={(e) => setNewLoan(p => ({ ...p, loanDate: e.target.value }))}
                    className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              {newLoan.interestType === "COMPOUND" && (
                <div className="space-y-1">
                  <Label className="text-gray-700 dark:text-gray-300"><T>Compounding Cycle</T></Label>
                  <Select value={newLoan.compoundFrequency} onValueChange={(val: any) => setNewLoan(p => ({ ...p, compoundFrequency: val }))}>
                    <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="ANNUALLY">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Pawned items section */}
              <div className="space-y-2 pt-2 border-t dark:border-gray-800">
                <div className="flex justify-between items-center">
                  <Label className="text-gray-900 dark:text-gray-100 font-bold"><T>Pawned Collateral Gold/Silver Ornaments *</T></Label>
                  <Button variant="outline" size="sm" onClick={addPawnedItemInput} className="text-xs h-7 border-amber-500/20 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 bg-white dark:bg-gray-900">
                    + <T>Add Item</T>
                  </Button>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {pawnedItems.map((item, idx) => {
                    const estValue = calculateMeltValue(item);
                    return (
                      <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-850/40 border dark:border-gray-800 rounded-xl space-y-2 relative">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-gray-600 dark:text-gray-400 text-[10px]"><T>Ornament Description</T></Label>
                            <Input
                              placeholder="e.g. 22K Solid Gold Chain"
                              value={item.name}
                              onChange={(e) => updatePawnedItemInput(idx, "name", e.target.value)}
                              className="h-8 text-xs bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-gray-600 dark:text-gray-400 text-[10px]"><T>Purity</T></Label>
                            <Select value={item.purity} onValueChange={(val: any) => updatePawnedItemInput(idx, "purity", val)}>
                              <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                                <SelectItem value="24K">24K Gold</SelectItem>
                                <SelectItem value="22K">22K Gold</SelectItem>
                                <SelectItem value="18K">18K Gold</SelectItem>
                                <SelectItem value="14K">14K Gold</SelectItem>
                                <SelectItem value="SILVER">Pure Silver</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-gray-600 dark:text-gray-400 text-[10px]"><T>Gross Wt (g)</T></Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="8.5"
                              value={item.grossWeight || ""}
                              onChange={(e) => updatePawnedItemInput(idx, "grossWeight", parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-gray-600 dark:text-gray-400 text-[10px]"><T>Net Gold Wt (g)</T></Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="8.0"
                              value={item.netWeight || ""}
                              onChange={(e) => updatePawnedItemInput(idx, "netWeight", parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800"
                            />
                          </div>
                          <div className="text-right flex flex-col justify-end pb-1.5 pr-1">
                            <span className="text-[9px] text-muted-foreground uppercase"><T>Est. Melt Value</T></span>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{formatCurrency(estValue)}</span>
                          </div>
                        </div>

                        {pawnedItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePawnedItemInput(idx)}
                            className="absolute -top-1 -right-1 p-1 rounded-full bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 shadow-sm"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t dark:border-gray-800">
              <div className="text-left">
                <span className="text-[10px] text-muted-foreground uppercase block"><T>Total Melt Value</T></span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalMeltValue(pawnedItems))}</span>
              </div>
              
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAddModalOpen(false)} className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><T>Cancel</T></Button>
                <Button className="bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 font-bold" size="sm" onClick={handleCreateLoan}><T>Create Girvi Loan</T></Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
