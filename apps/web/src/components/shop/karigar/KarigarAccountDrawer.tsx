"use client";

import React, { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Download,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { karigarApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KarigarStatementPrint } from "./KarigarStatementPrint";
import { JobCostSummaryModal } from "./JobCostSummaryModal";
import { useT } from "@/providers/translation-provider";
import { T } from "@/components/ui/T";

export interface KarigarAccountDrawerProps {
  workshopId: string;
  shopCurrency?: string;
  onClose: () => void;
  onRefreshParent?: () => void;
}

export function KarigarAccountDrawer({
  workshopId,
  shopCurrency = "NPR",
  onClose,
  onRefreshParent,
}: KarigarAccountDrawerProps) {
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [accountData, setAccountData] = useState<any>(null);
  const [statementData, setStatementData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"statement" | "jobs">("statement");
  const [statementFilter, setStatementFilter] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedJobCostId, setSelectedJobCostId] = useState<string | null>(
    null,
  );

  // Action forms state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Payment Form
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("CASH");
  const [payRef, setPayRef] = useState<string>("");
  const [payNote, setPayNote] = useState<string>("");

  // Advance Form
  const [advAmount, setAdvAmount] = useState<string>("");
  const [advMethod, setAdvMethod] = useState<string>("CASH");
  const [advRef, setAdvRef] = useState<string>("");
  const [advNote, setAdvNote] = useState<string>("");

  // Metal Return Form (Reconcile workshop float - generic return does NOT include finished returns)
  const [retType, setRetType] = useState<string>("RETURN_UNUSED");
  const [retMetalKey, setRetMetalKey] = useState<string>("goldGrains24k");
  const [retWeight, setRetWeight] = useState<string>("");
  const [retJobId, setRetJobId] = useState<string>("");
  const [retNote, setRetNote] = useState<string>("");

  // Adjustment Form
  const [adjType, setAdjType] = useState<
    "ADJUSTMENT_INCREASE" | "ADJUSTMENT_DECREASE"
  >("ADJUSTMENT_INCREASE");
  const [adjAmount, setAdjAmount] = useState<string>("");
  const [adjNote, setAdjNote] = useState<string>("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [accRes, stmtRes] = await Promise.all([
        karigarApi.getAccount(workshopId),
        karigarApi.getStatement(workshopId, {
          type: statementFilter === "ALL" ? undefined : statementFilter,
          limit: 250,
        }),
      ]);
      setAccountData(accRes.data);
      setStatementData(stmtRes.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          t("Failed to load karigar account data"),
      );
    } finally {
      setLoading(false);
    }
  }, [workshopId, statementFilter, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currency = accountData?.currency || statementData?.currency || shopCurrency;
  const workshop = accountData?.workshop;

  // CSV Export handler (uses authoritative loaded statement)
  const handleExportCSV = () => {
    if (!statementData?.items || statementData.items.length === 0) return;
    const headers = [
      "Date",
      "Kind",
      "Event Type",
      "Job / Material",
      "Quantity (g)",
      `Amount (${currency})`,
      "Method",
      "Reference",
      "Note",
    ];
    const rows = statementData.items.map((it: any) => [
      format(new Date(it.createdAt), "yyyy-MM-dd HH:mm"),
      it.kind,
      it.eventType,
      `"${(it.jobProduct || it.metalKey || "").replace(/"/g, '""')}"`,
      it.quantity != null ? it.quantity : "",
      it.amount != null ? it.amount : "",
      it.paymentMethod || "",
      `"${(it.reference || "").replace(/"/g, '""')}"`,
      `"${(it.note || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `karigar_${workshop?.name || "account"}_statement.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError(t("Please enter a valid positive payment amount"));
      return;
    }
    if (payMethod === "OTHER" && !payRef.trim() && !payNote.trim()) {
      setActionError(t("Reference or note is required for Other payment method"));
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      await karigarApi.recordPayment(workshopId, {
        amount: amountNum,
        paymentMethod: payMethod,
        reference: payRef || undefined,
        note: payNote || undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      setActionSuccess(t("Settlement payment recorded successfully"));
      setShowPayModal(false);
      setPayAmount("");
      setPayRef("");
      setPayNote("");
      loadData();
      onRefreshParent?.();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || t("Failed to record payment"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Advance
  const handleSubmitAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(advAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError(t("Please enter a valid positive advance amount"));
      return;
    }
    if (advMethod === "OTHER" && !advRef.trim() && !advNote.trim()) {
      setActionError(t("Reference or note is required for Other payment method"));
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      await karigarApi.recordAdvance(workshopId, {
        amount: amountNum,
        paymentMethod: advMethod,
        reference: advRef || undefined,
        note: advNote || undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      setActionSuccess(t("Advance payment recorded successfully"));
      setShowAdvanceModal(false);
      setAdvAmount("");
      setAdvRef("");
      setAdvNote("");
      loadData();
      onRefreshParent?.();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || t("Failed to record advance"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Metal Return
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    const weightNum = parseFloat(retWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      setActionError(t("Please enter a valid positive weight"));
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      await karigarApi.recordMetalReturn(workshopId, {
        type: retType as any,
        metalKey: retMetalKey,
        weightGrams: weightNum,
        jobId: retJobId || undefined,
        note: retNote || undefined,
        idempotencyKey: crypto.randomUUID(),
      });
      setActionSuccess(t("Metal return reconciled successfully"));
      setShowReturnModal(false);
      setRetWeight("");
      setRetJobId("");
      setRetNote("");
      loadData();
      onRefreshParent?.();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || t("Failed to record metal return"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Adjustment
  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(adjAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError(t("Please enter a valid positive adjustment amount"));
      return;
    }
    if (!adjNote.trim()) {
      setActionError(t("Please provide a reason note for the adjustment"));
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      await karigarApi.recordAdjustment(workshopId, {
        type: adjType,
        amount: amountNum,
        note: adjNote,
        idempotencyKey: crypto.randomUUID(),
      });
      setActionSuccess(t("Financial adjustment recorded successfully"));
      setShowAdjustModal(false);
      setAdjAmount("");
      setAdjNote("");
      loadData();
      onRefreshParent?.();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || t("Failed to record adjustment"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl h-full flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 relative">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {workshop?.name || <T>Karigar Account</T>}
                </h2>
                {accountData?.summary && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      accountData.summary.advanceBalance > 0
                        ? "border-purple-300 text-purple-700 dark:text-purple-300 bg-purple-50/50"
                        : accountData.summary.amountPayable > 0
                          ? "border-amber-300 text-amber-700 dark:text-amber-300 bg-amber-50/50"
                          : "border-emerald-300 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50"
                    }`}
                  >
                    {accountData.summary.advanceBalance > 0 ? (
                      <T>Advance in Hand</T>
                    ) : accountData.summary.amountPayable > 0 ? (
                      <T>Wages Payable</T>
                    ) : (
                      <T>Settled</T>
                    )}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <T>Artisan</T>: {workshop?.artisan || "—"} •{" "}
                {workshop?.location || "Workshop"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={loadData}
              title={t("Refresh statement")}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Global Action Alerts */}
        {actionError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && !accountData ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-amber-500" />
              <p className="text-sm font-medium">
                <T>Loading Karigar account & statement...</T>
              </p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : accountData ? (
            <>
              {/* Financial KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                    {accountData.summary.advanceBalance > 0 ? (
                      <T>Advance in Hand</T>
                    ) : (
                      <T>Wages Payable</T>
                    )}
                  </span>
                  <p
                    className={`text-lg font-black mt-1 ${
                      accountData.summary.advanceBalance > 0
                        ? "text-purple-600 dark:text-purple-400"
                        : accountData.summary.amountPayable > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {currency}{" "}
                    {(accountData.summary.advanceBalance > 0
                      ? accountData.summary.advanceBalance
                      : accountData.summary.amountPayable
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1">
                    <T>Rate</T>: {currency} {workshop?.wageRatePerGram || 0}/g
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                    <T>Accrued Wages</T>
                  </span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {currency}{" "}
                    {accountData.summary.totalWagesAccrued.toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2 },
                    )}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1">
                    <T>From finished returns</T>
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                    <T>Settlements Paid</T>
                  </span>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {currency}{" "}
                    {accountData.summary.totalSettlementsPaid.toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2 },
                    )}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1">
                    <T>Advances</T>: {currency}{" "}
                    {accountData.summary.totalAdvances.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                    <T>Active Jobs</T>
                  </span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {accountData.openJobs?.length || 0}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {workshop?.phone || <T>Workshop Float</T>}
                  </span>
                </div>
              </div>

              {/* Physical Metal Balances / Float Table */}
              {accountData.metalBalances && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/40 dark:bg-slate-800/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                      <T>Physical Metal Float with Karigar</T>
                    </h4>
                    <span className="text-xs text-slate-400">
                      <T>Limit</T>: {workshop?.wastageLimit ?? 1}
                      <T>% allowed wastage</T>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {accountData.metalBalances.map((mb: any) => (
                      <div
                        key={mb.metalKey}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 flex flex-col justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {mb.metalKey}
                        </span>
                        <div className="flex items-baseline justify-between mt-2">
                          <span className="text-[10px] text-slate-400">
                            {mb.issuedGrams.toFixed(1)}g <T>in</T> /{" "}
                            {mb.returnedGrams.toFixed(1)}g <T>out</T>
                          </span>
                          <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                            {mb.outstandingGrams.toFixed(3)}g
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Primary Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  onClick={() => setShowPayModal(true)}
                  disabled={accountData.summary.amountPayable <= 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 h-10 rounded-xl shadow-sm"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <T>Pay Wages</T>
                </Button>

                <Button
                  onClick={() => setShowAdvanceModal(true)}
                  variant="outline"
                  className="border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs font-semibold flex items-center justify-center gap-1.5 h-10 rounded-xl"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <T>Record Advance</T>
                </Button>

                <Button
                  onClick={() => setShowReturnModal(true)}
                  variant="outline"
                  className="border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-semibold flex items-center justify-center gap-1.5 h-10 rounded-xl"
                >
                  <Coins className="w-4 h-4" />
                  <T>Return Metal</T>
                </Button>

                <Button
                  onClick={() => setShowAdjustModal(true)}
                  variant="outline"
                  className="text-xs font-semibold flex items-center justify-center gap-1.5 h-10 rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                  <T>Adjust Balance</T>
                </Button>
              </div>

              {/* Secondary Navigation & Statement View Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Select
                    value={statementFilter}
                    onValueChange={(val) => setStatementFilter(val)}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue placeholder={t("Filter Events")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL"><T>All Events</T></SelectItem>
                      <SelectItem value="METAL"><T>Metal Only</T></SelectItem>
                      <SelectItem value="MONEY"><T>Financial Only</T></SelectItem>
                      <SelectItem value="WAGES"><T>Wages Accrued</T></SelectItem>
                      <SelectItem value="PAYMENTS"><T>Payments</T></SelectItem>
                      <SelectItem value="ADVANCES"><T>Advances</T></SelectItem>
                      <SelectItem value="ADJUSTMENTS"><T>Adjustments</T></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <T>CSV</T>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPrintModal(true)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <T>Print</T>
                  </Button>
                </div>
              </div>

              {/* Unified Statement Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    <T>Unified Statement Timeline</T> (
                    {statementData?.items?.length || 0})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    <T>Chronological Subledger</T>
                  </span>
                </div>

                {statementData?.items?.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                    <T>No transactions found for the selected filter.</T>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {statementData?.items?.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs hover:border-amber-300 dark:hover:border-amber-700/60 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg mt-0.5 ${
                              item.kind === "METAL"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                : item.eventType === "WAGE_ACCRUAL"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                  : item.eventType === "SETTLEMENT_PAYMENT"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : item.eventType === "ADVANCE_PAYMENT"
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                                      : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                            }`}
                          >
                            {item.kind === "METAL" ? (
                              <Coins className="w-4 h-4" />
                            ) : item.eventType === "SETTLEMENT_PAYMENT" ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : item.eventType === "ADVANCE_PAYMENT" ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ShieldCheck className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {item.eventType.replace(/_/g, " ")}
                              </span>
                              {item.jobProduct && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    item.jobId &&
                                    setSelectedJobCostId(item.jobId)
                                  }
                                  className="text-[11px] text-amber-600 dark:text-amber-400 font-medium hover:underline flex items-center gap-0.5"
                                >
                                  {item.jobProduct}
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                            <p className="text-slate-500 text-[11px] mt-0.5">
                              {format(
                                new Date(item.createdAt),
                                "dd MMM yyyy, hh:mm a",
                              )}
                              {item.paymentMethod && (
                                <span>
                                  {" "}
                                  • <T>via</T> {item.paymentMethod}
                                </span>
                              )}
                              {item.reference && (
                                <span>
                                  {" "}
                                  • <T>Ref</T>: {item.reference}
                                </span>
                              )}
                            </p>
                            {item.note && (
                              <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-1 italic">
                                &ldquo;{item.note}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          {item.kind === "METAL" ? (
                            <span className="font-bold text-slate-900 dark:text-white text-sm block">
                              {item.quantity?.toFixed(3)}g
                            </span>
                          ) : (
                            <span
                              className={`font-black text-sm block ${
                                item.eventType === "SETTLEMENT_PAYMENT"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : item.eventType === "ADVANCE_PAYMENT"
                                    ? "text-purple-600 dark:text-purple-400"
                                    : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {item.eventType === "SETTLEMENT_PAYMENT"
                                ? "-"
                                : item.eventType === "WAGE_ACCRUAL"
                                  ? "+"
                                  : ""}
                              {currency}{" "}
                              {item.amount?.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {item.metalKey || (
                              <T>Subledger</T>
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* ================= MODALS & FORMS ================= */}

        {/* 1. Pay Wages Modal */}
        {showPayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    <T>Pay Accrued Wages</T>
                  </h3>
                  <p className="text-xs text-slate-500">
                    <T>Max payable</T>: {currency}{" "}
                    {accountData?.summary?.amountPayable?.toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setShowPayModal(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmitPayment} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <Label>
                    <T>Payment Amount</T> ({currency}) *
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={accountData?.summary?.amountPayable}
                      required
                      placeholder="0.00"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="text-sm font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPayAmount(
                          String(accountData?.summary?.amountPayable || 0),
                        )
                      }
                      className="absolute right-2 top-2 text-[10px] text-amber-600 font-bold uppercase hover:underline"
                    >
                      <T>Pay Full</T>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>
                    <T>Payment Method</T>
                  </Label>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH"><T>Cash</T></SelectItem>
                      <SelectItem value="BANK_TRANSFER"><T>Bank Transfer</T></SelectItem>
                      <SelectItem value="UPI"><T>UPI / QR Payment</T></SelectItem>
                      <SelectItem value="ESEWA"><T>eSewa</T></SelectItem>
                      <SelectItem value="KHALTI"><T>Khalti</T></SelectItem>
                      <SelectItem value="CONNECTIPS"><T>connectIPS</T></SelectItem>
                      <SelectItem value="CHEQUE"><T>Cheque</T></SelectItem>
                      <SelectItem value="OTHER"><T>Other Method</T></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>
                    <T>Reference / Voucher No.</T>
                  </Label>
                  <Input
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder={t("e.g. CHQ-99823 or TXN-4411")}
                    maxLength={120}
                  />
                </div>

                <div className="space-y-1">
                  <Label>
                    <T>Note</T>
                  </Label>
                  <Input
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    placeholder={t("Optional settlement notes")}
                    maxLength={1000}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPayModal(false)}
                  >
                    <T>Cancel</T>
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    {actionLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    )}
                    <T>Confirm Settlement</T>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. Record Advance Modal */}
        {showAdvanceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    <T>Record Advance Payment</T>
                  </h3>
                  <p className="text-xs text-slate-500">
                    <T>Will create an advance balance against future jobs</T>
                  </p>
                </div>
                <button onClick={() => setShowAdvanceModal(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmitAdvance} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <Label>
                    <T>Advance Amount</T> ({currency}) *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={advAmount}
                    onChange={(e) => setAdvAmount(e.target.value)}
                    className="text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label>
                    <T>Payment Method</T>
                  </Label>
                  <Select value={advMethod} onValueChange={setAdvMethod}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH"><T>Cash</T></SelectItem>
                      <SelectItem value="BANK_TRANSFER"><T>Bank Transfer</T></SelectItem>
                      <SelectItem value="UPI"><T>UPI / QR Payment</T></SelectItem>
                      <SelectItem value="ESEWA"><T>eSewa</T></SelectItem>
                      <SelectItem value="KHALTI"><T>Khalti</T></SelectItem>
                      <SelectItem value="CONNECTIPS"><T>connectIPS</T></SelectItem>
                      <SelectItem value="CHEQUE"><T>Cheque</T></SelectItem>
                      <SelectItem value="OTHER"><T>Other Method</T></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>
                    <T>Reference / Notes</T>
                  </Label>
                  <Input
                    value={advRef}
                    onChange={(e) => setAdvRef(e.target.value)}
                    placeholder={t("e.g. Festival advance")}
                    maxLength={120}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAdvanceModal(false)}
                  >
                    <T>Cancel</T>
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                  >
                    {actionLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    )}
                    <T>Record Advance</T>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Reconcile / Return Metal Modal (Workshop Float Reconciliation) */}
        {showReturnModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    <T>Reconcile / Return Metal</T>
                  </h3>
                  <p className="text-xs text-slate-500">
                    <T>Increases shop vault & reduces karigar outstanding float</T>
                  </p>
                </div>
                <button onClick={() => setShowReturnModal(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-[11px]">
                <T>
                  To return finished jewellery and accrue wages, use the finished return flow on the specific production job.
                </T>
              </div>

              <form onSubmit={handleSubmitReturn} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <Label>
                    <T>Movement / Return Type</T> *
                  </Label>
                  <Select value={retType} onValueChange={setRetType}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RETURN_UNUSED"><T>Return Unused Metal (No wage)</T></SelectItem>
                      <SelectItem value="RETURN_SPRUE"><T>Return Sprue / Button</T></SelectItem>
                      <SelectItem value="SCRAP"><T>Return Workshop Scrap</T></SelectItem>
                      <SelectItem value="DUST"><T>Return Sweep / Dust</T></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>
                    <T>Material Type</T> *
                  </Label>
                  <Select value={retMetalKey} onValueChange={setRetMetalKey}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accountData?.metalBalances?.map((mb: any) => (
                        <SelectItem key={mb.metalKey} value={mb.metalKey}>
                          {mb.metalKey} (<T>Max float</T>: {mb.outstandingGrams.toFixed(3)}g)
                        </SelectItem>
                      )) || (
                        <SelectItem value="goldGrains24k"><T>goldGrains24k</T></SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>
                    <T>Weight in Grams</T> *
                  </Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    placeholder="0.000"
                    value={retWeight}
                    onChange={(e) => setRetWeight(e.target.value)}
                    className="text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label>
                    <T>Notes</T>
                  </Label>
                  <Input
                    value={retNote}
                    onChange={(e) => setRetNote(e.target.value)}
                    placeholder={t("e.g. Unused casting gold reconciliation")}
                    maxLength={400}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReturnModal(false)}
                  >
                    <T>Cancel</T>
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  >
                    {actionLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    )}
                    <T>Confirm Return</T>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. Authorised Adjustment Modal */}
        {showAdjustModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    <T>Authorised Adjustment</T>
                  </h3>
                  <p className="text-xs text-slate-500">
                    <T>Append an immutable financial adjustment</T>
                  </p>
                </div>
                <button onClick={() => setShowAdjustModal(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmitAdjustment} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <Label>
                    <T>Adjustment Type</T> *
                  </Label>
                  <Select
                    value={adjType}
                    onValueChange={(val: any) => setAdjType(val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADJUSTMENT_INCREASE"><T>Increase Payable (Credit Karigar)</T></SelectItem>
                      <SelectItem value="ADJUSTMENT_DECREASE"><T>Decrease Payable (Debit Karigar / Deduction)</T></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>
                    <T>Adjustment Amount</T> ({currency}) *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    className="text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <Label>
                    <T>Reason Note (Required)</T> *
                  </Label>
                  <Input
                    required
                    value={adjNote}
                    onChange={(e) => setAdjNote(e.target.value)}
                    placeholder={t("e.g. Intricacy bonus or damage penalty deduction")}
                    maxLength={1000}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAdjustModal(false)}
                  >
                    <T>Cancel</T>
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="font-semibold"
                  >
                    {actionLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    )}
                    <T>Record Adjustment</T>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 5. Authorised A4 Statement Print Modal */}
        {showPrintModal && workshop && accountData?.summary && (
          <KarigarStatementPrint
            workshop={workshop}
            currency={currency}
            summary={accountData.summary}
            metalBalances={accountData.metalBalances || []}
            items={statementData?.items || []}
            shopName={statementData?.shopName}
            onClose={() => setShowPrintModal(false)}
          />
        )}

        {/* 6. Job Cost Summary Drilldown Modal */}
        {selectedJobCostId && (
          <JobCostSummaryModal
            jobId={selectedJobCostId}
            currency={currency}
            onClose={() => setSelectedJobCostId(null)}
          />
        )}
      </div>
    </div>
  );
}
