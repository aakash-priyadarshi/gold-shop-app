"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, X, AlertCircle, CheckCircle2, Coins, ArrowDownLeft } from "lucide-react";
import { karigarApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface JobCostSummaryModalProps {
  jobId: string;
  currency: string;
  onClose: () => void;
}

export function JobCostSummaryModal({
  jobId,
  currency,
  onClose,
}: JobCostSummaryModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await karigarApi.getJobCostSummary(jobId);
        if (mounted) {
          setData(res.data);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.response?.data?.message || "Failed to load job cost breakdown");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [jobId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Job Cost & Wage Reconciliation
              </h3>
              {data?.status && (
                <Badge variant="outline" className="text-xs">
                  {data.status}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {data?.product || "Production Job Details"} • Artisan: {data?.artisan || "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">Loading job reconciliation data...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                    Accrued Wage
                  </span>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {currency} {data.wageAccrued.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                    Settlements Allocated
                  </span>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {currency} {data.settlementAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold uppercase text-amber-800 dark:text-amber-400 block">
                    Wage Outstanding
                  </span>
                  <p className="text-lg font-bold text-amber-900 dark:text-amber-300 mt-1">
                    {currency} {data.wageOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Metal Balances */}
              {data.metalBalances?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">
                    Metal Float on this Job
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-2.5">Material</th>
                          <th className="p-2.5 text-right">Issued</th>
                          <th className="p-2.5 text-right">Returned</th>
                          <th className="p-2.5 text-right font-bold text-slate-900 dark:text-white">Outstanding</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.metalBalances.map((mb: any) => (
                          <tr key={mb.metalKey}>
                            <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">
                              {mb.metalKey}
                            </td>
                            <td className="p-2.5 text-right text-slate-600 dark:text-slate-400">
                              {mb.issuedGrams.toFixed(3)}g
                            </td>
                            <td className="p-2.5 text-right text-slate-600 dark:text-slate-400">
                              {mb.returnedGrams.toFixed(3)}g
                            </td>
                            <td className="p-2.5 text-right font-bold text-amber-600 dark:text-amber-400">
                              {mb.outstandingGrams.toFixed(3)}g
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Accruals & Allocations History */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">
                    Wage Accrual Events ({data.accruals?.length || 0})
                  </h4>
                  {data.accruals?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">
                      No wage accrual recorded yet for this job.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.accruals.map((acc: any) => (
                        <div
                          key={acc.id}
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {acc.note || "Finished return wage accrual"}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {format(new Date(acc.createdAt), "dd MMM yyyy, hh:mm a")}
                            </span>
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            +{currency} {acc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">
                    Settlement Allocations ({data.allocations?.length || 0})
                  </h4>
                  {data.allocations?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">
                      No payments allocated to this job yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {data.allocations.map((alloc: any) => (
                        <div
                          key={alloc.id}
                          className="flex items-center justify-between p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs"
                        >
                          <div>
                            <span className="font-semibold text-emerald-900 dark:text-emerald-300 block">
                              {alloc.paymentMethod || "Settlement payment"} {alloc.reference ? `(${alloc.reference})` : ""}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {format(new Date(alloc.createdAt), "dd MMM yyyy, hh:mm a")}
                            </span>
                          </div>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            -{currency} {alloc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
