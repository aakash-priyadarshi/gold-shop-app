"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  const [selectedJobCostId, setSelectedJobCostId] = useState<string | null>(null);

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

  // Metal Return Form
  const [retType, setRetType] = useState<string>("RETURN_UNUSED");
  const [retMetalKey, setRetMetalKey] = useState<string>("goldGrains24k");
  const [retWeight, setRetWeight] = useState<string>("");
  const [retJobId, setRetJobId] = useState<string>("");
  const [retNote, setRetNote] = useState<string>("");

  // Adjustment Form
  const [adjType, setAdjType] = useState<"ADJUSTMENT_INCREASE" | "ADJUSTMENT_DECREASE">("ADJUSTMENT_INCREASE");
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
          limit: 100,
        }),
      ]);
      setAccountData(accRes.data);
      setStatementData(stmtRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load karigar account data");
    } finally {
      setLoading(false);
    }
  }, [workshopId, statementFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currency = accountData?.currency || shopCurrency;
  const workshop = accountData?.workshop;

  // CSV Export handler
  const handleExportCSV = () => {
    if (!statementData?.items || statementData.items.length === 0) return;
    const headers = ["Date", "Kind", "Event Type", "Job / Material", "Quantity (g)", `Amount (${currency})`, "Method", "Reference", "Note"];
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
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `karigar_${workshop?.name || "account"}_statement.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError("Please enter a valid positive payment amount");
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
      });
      setActionSuccess("Settlement payment recorded successfully");
      setShowPayModal(false);
      setPayAmount("");
      setPayRef("");
      setPayNote("");
      loadData();
      onRefreshParent?.();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to record payment");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Advance
  const handleSubmitAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(advAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError("Please enter a valid positive advance amount");
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
      });
      setActionSuccess("Advance payment recorded successfully");
      setShowAdvanceModal(false);
      setAdvAmount("");
      setAdvRef("");
      setAdvNote("");
      loadData();
      onRefreshParent?.();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to record advance");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Metal Return
  const handleSubmitMetalReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    const weightNum = parseFloat(retWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      setActionError("Please enter a valid positive weight in grams");
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
      });
      setActionSuccess("Metal return recorded and vault balance updated");
      setShowReturnModal(false);
      setRetWeight("");
      setRetNote("");
      setRetJobId("");
      loadData();
      onRefreshParent?.();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to record metal return");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Adjustment
  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(adjAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError("Please enter a valid positive adjustment amount");
      return;
    }
    if (!adjNote.trim()) {
      setActionError("A reason note is required for ledger adjustments");
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      await karigarApi.recordAdjustment(workshopId, {
        type: adjType,
        amount: amountNum,
        note: adjNote,
      });
      setActionSuccess("Financial adjustment recorded");
      setShowAdjustModal(false);
      setAdjAmount("");
      setAdjNote("");
      loadData();
      onRefreshParent?.();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Failed to record adjustment");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      />

      {/* Main Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {workshop?.name || "Karigar Account"}
              </h2>
              {accountData?.advanceBalance > 0 ? (
                <Badge className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200">
                  Advance in Hand
                </Badge>
              ) : accountData?.amountPayable > 0 ? (
                <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200">
                  Wages Payable
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200">
                  Settled
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Artisan: <span className="font-semibold text-slate-700 dark:text-slate-300">{workshop?.artisan || "—"}</span>
              {workshop?.phone && ` • Tel: ${workshop.phone}`}
              {workshop?.location && ` • ${workshop.location}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              title="Refresh statement"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Alerts */}
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
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">Loading Karigar account & statement...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          ) : accountData ? (
            <>
              {/* Financial KPI Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                    {accountData.advanceBalance > 0 ? "Advance in Hand" : "Amount Payable"}
                  </span>
                  <p className="text-xl font-black text-amber-900 dark:text-amber-300 mt-1">
                    {currency}{" "}
                    {(accountData.advanceBalance > 0
                      ? accountData.advanceBalance
                      : accountData.amountPayable
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400/80 mt-0.5 block">
                    Rate: {currency} {workshop?.wageRatePerGram || 0}/g
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                    Accrued Wages
                  </span>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {currency} {accountData.totalWagesAccrued.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    From finished returns
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                    Settlements Paid
                  </span>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {currency} {accountData.totalSettlementsPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Advances: {currency} {accountData.totalAdvances.toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                    Active Jobs
                  </span>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {accountData.openJobs}
                  </p>
                  <span className="text-[10px] text-rose-500 mt-0.5 block">
                    {accountData.overdueJobs > 0 ? `${accountData.overdueJobs} overdue` : "On schedule"}
                  </span>
                </div>
              </div>

              {/* Metal Positions */}
              {accountData.metalBalances?.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Physical Metal Float with Karigar
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Limit: {workshop?.wastageLimit}% allowed wastage
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {accountData.metalBalances.map((mb: any) => (
                      <div
                        key={mb.metalKey}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3"
                      >
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block truncate">
                          {mb.metalKey}
                        </span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-lg font-black text-amber-700 dark:text-amber-400">
                            {mb.outstandingGrams.toFixed(3)} g
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {mb.returnedGrams.toFixed(1)} / {mb.issuedGrams.toFixed(1)} g
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => setShowPayModal(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm"
                  size="sm"
                  disabled={accountData.amountPayable <= 0}
                >
                  Pay Wages
                </Button>
                <Button
                  onClick={() => setShowAdvanceModal(true)}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold"
                >
                  Record Advance
                </Button>
                <Button
                  onClick={() => setShowReturnModal(true)}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold"
                >
                  Return Metal
                </Button>
                <Button
                  onClick={() => setShowAdjustModal(true)}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Adjust Balance
                </Button>

                <div className="ml-auto flex items-center gap-2">
                  <Button
                    onClick={handleExportCSV}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    CSV
                  </Button>
                  <Button
                    onClick={() => setShowPrintModal(true)}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    Print
                  </Button>
                </div>
              </div>

              {/* Statement / Jobs Tabs */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 mb-4">
                  <div className="flex gap-4 text-sm font-semibold">
                    <button
                      onClick={() => setActiveTab("statement")}
                      className={`pb-2.5 relative transition ${
                        activeTab === "statement"
                          ? "text-amber-700 dark:text-amber-400 font-bold border-b-2 border-amber-600"
                          : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      Unified Statement Timeline ({statementData?.totalCount || 0})
                    </button>
                  </div>

                  {activeTab === "statement" && (
                    <div className="flex items-center gap-1.5 pb-2">
                      {["ALL", "METAL", "WAGES", "PAYMENTS", "ADVANCES", "ADJUSTMENTS"].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setStatementFilter(filter)}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                            statementFilter === filter
                              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tab: Statement Timeline */}
                {activeTab === "statement" && (
                  <div className="space-y-2">
                    {statementData?.items?.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs italic">
                        No transactions found for the selected filter.
                      </div>
                    ) : (
                      statementData?.items?.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg mt-0.5 ${
                                item.kind === "METAL"
                                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400"
                                  : item.eventType === "SETTLEMENT_PAYMENT"
                                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400"
                                    : item.eventType === "ADVANCE_PAYMENT"
                                      ? "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-400"
                                      : "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400"
                              }`}
                            >
                              {item.kind === "METAL" ? (
                                <Coins className="w-4 h-4" />
                              ) : (
                                <ArrowDownLeft className="w-4 h-4" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {item.eventType.replace(/_/g, " ")}
                                </span>
                                {item.jobProduct && (
                                  <button
                                    onClick={() => setSelectedJobCostId(item.jobId)}
                                    className="text-amber-700 dark:text-amber-400 font-semibold underline underline-offset-2 hover:opacity-80 inline-flex items-center gap-0.5"
                                  >
                                    {item.jobProduct}
                                    <ExternalLink className="w-2.5 h-2.5 inline" />
                                  </button>
                                )}
                              </div>
                              <p className="text-slate-500 text-[11px] mt-0.5">
                                {item.reference ? `Ref: ${item.reference} • ` : ""}
                                {item.note || "Standard entry"}
                              </p>
                              <span className="text-[10px] text-slate-400">
                                {format(new Date(item.createdAt), "dd MMM yyyy, hh:mm a")}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            {item.quantity != null && (
                              <p className="font-black text-slate-900 dark:text-white text-sm">
                                {item.quantity > 0 ? "+" : ""}
                                {item.quantity.toFixed(3)} g
                              </p>
                            )}
                            {item.amount != null && (
                              <p
                                className={`font-black text-sm ${
                                  item.eventType === "SETTLEMENT_PAYMENT" || item.eventType === "ADVANCE_PAYMENT"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-slate-900 dark:text-white"
                                }`}
                              >
                                {item.eventType === "SETTLEMENT_PAYMENT" || item.eventType === "ADVANCE_PAYMENT" ? "-" : "+"}
                                {currency} {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                            )}
                            {item.paymentMethod && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                via {item.paymentMethod.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Pay Wages Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Pay Accrued Wages</h3>
                <p className="text-xs text-slate-500">Max payable: {currency} {accountData?.amountPayable?.toLocaleString()}</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4 pt-4">
              <div>
                <Label className="text-xs">Payment Amount ({currency}) *</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={accountData?.amountPayable}
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="pr-16 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(accountData?.amountPayable || 0))}
                    className="absolute right-2 top-2 px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition"
                  >
                    Pay Full
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer / UPI / Fonepay</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="WALLET">Digital Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Reference / Voucher No.</Label>
                <Input
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. CHQ-99823 or TXN-4411"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Note</Label>
                <Input
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Optional settlement notes"
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPayModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Confirm Settlement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Advance Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Record Advance Payment</h3>
                <p className="text-xs text-slate-500">Will create an advance balance against future jobs</p>
              </div>
              <button onClick={() => setShowAdvanceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdvance} className="space-y-4 pt-4">
              <div>
                <Label className="text-xs">Advance Amount ({currency}) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={advAmount}
                  onChange={(e) => setAdvAmount(e.target.value)}
                  placeholder="e.g. 10000"
                  className="mt-1 font-bold"
                />
              </div>

              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={advMethod} onValueChange={setAdvMethod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer / UPI</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="WALLET">Digital Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Reference / Notes</Label>
                <Input
                  value={advRef}
                  onChange={(e) => setAdvRef(e.target.value)}
                  placeholder="e.g. Festival advance"
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAdvanceModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Record Advance
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return Metal Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Reconcile / Return Metal</h3>
                <p className="text-xs text-slate-500">Increases shop vault & reduces karigar outstanding float</p>
              </div>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMetalReturn} className="space-y-4 pt-4">
              <div>
                <Label className="text-xs">Movement / Return Type *</Label>
                <Select value={retType} onValueChange={setRetType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RETURN_UNUSED">Return Unused Metal (No wage)</SelectItem>
                    <SelectItem value="RETURN_FINISHED">Return Finished Jewellery (Accrues wage)</SelectItem>
                    <SelectItem value="RETURN_SPRUE">Return Sprue / Button</SelectItem>
                    <SelectItem value="SCRAP">Return Workshop Scrap</SelectItem>
                    <SelectItem value="DUST">Return Sweep / Dust</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Material Type *</Label>
                <Select value={retMetalKey} onValueChange={setRetMetalKey}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountData?.metalBalances?.map((mb: any) => (
                      <SelectItem key={mb.metalKey} value={mb.metalKey}>
                        {mb.metalKey} (Max float: {mb.outstandingGrams.toFixed(3)}g)
                      </SelectItem>
                    )) || <SelectItem value="goldGrains24k">goldGrains24k</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Weight in Grams *</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={retWeight}
                  onChange={(e) => setRetWeight(e.target.value)}
                  placeholder="e.g. 15.450"
                  className="mt-1 font-bold"
                />
              </div>

              <div>
                <Label className="text-xs">Notes</Label>
                <Input
                  value={retNote}
                  onChange={(e) => setRetNote(e.target.value)}
                  placeholder="e.g. Unused casting gold reconciliation"
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowReturnModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Confirm Return
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Authorised Adjustment</h3>
                <p className="text-xs text-slate-500">Append an immutable financial adjustment</p>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="space-y-4 pt-4">
              <div>
                <Label className="text-xs">Adjustment Type *</Label>
                <Select value={adjType} onValueChange={(val: any) => setAdjType(val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADJUSTMENT_INCREASE">Increase Payable (Credit Karigar)</SelectItem>
                    <SelectItem value="ADJUSTMENT_DECREASE">Decrease Payable (Debit Karigar / Deduction)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Adjustment Amount ({currency}) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="mt-1 font-bold"
                />
              </div>

              <div>
                <Label className="text-xs">Reason Note (Required) *</Label>
                <Input
                  required
                  value={adjNote}
                  onChange={(e) => setAdjNote(e.target.value)}
                  placeholder="e.g. Intricacy bonus or damage penalty deduction"
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAdjustModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold dark:bg-white dark:text-slate-900"
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Record Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Statement Modal */}
      {showPrintModal && (
        <KarigarStatementPrint
          workshop={workshop}
          currency={currency}
          summary={accountData}
          metalBalances={accountData.metalBalances || []}
          items={statementData?.items || []}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Job Cost Summary Modal */}
      {selectedJobCostId && (
        <JobCostSummaryModal
          jobId={selectedJobCostId}
          currency={currency}
          onClose={() => setSelectedJobCostId(null)}
        />
      )}
    </>
  );
}
