"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import {
  workshopApi,
  type WorkshopJob,
  type WorkshopTransfer,
} from "@/lib/workshop-api";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Coins,
  History,
  Loader2,
  Package,
  RefreshCw,
  RotateCcw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { WorkshopFinishedReceiptDialog } from "../finished/WorkshopFinishedReceiptDialog";
import Link from "next/link";
import { supplyChainHref } from "@/lib/workshop-route";

export function WorkshopQcModule({ canApprove = true }: { canApprove?: boolean }) {
  const t = useT();
  const [jobs, setJobs] = useState<WorkshopJob[]>([]);
  const [transfers, setTransfers] = useState<WorkshopTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  // Inspector Action State
  const [selectedJob, setSelectedJob] = useState<WorkshopJob | null>(null);
  const [qcAction, setQcAction] = useState<"APPROVED" | "REWORK" | "REJECTED">("APPROVED");
  const [qcReason, setQcReason] = useState("");
  const [submittingQc, setSubmittingQc] = useState(false);
  const [qcError, setQcError] = useState<string | null>(null);

  // Finished Receipt Dialog
  const [receiptJob, setReceiptJob] = useState<WorkshopJob | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, trRes] = await Promise.allSettled([
        workshopApi.jobs(),
        workshopApi.transfers(),
      ]);

      if (jobsRes.status === "fulfilled") setJobs(jobsRes.value.data || []);
      if (trRes.status === "fulfilled") setTransfers(trRes.value.data || []);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute QC blocker diagnostics for each job
  const getBlockersForJob = useCallback(
    (job: WorkshopJob) => {
      const blockers: string[] = [];

      const openRuns = (job.workshopProcessRuns || []).filter((r) => r.status !== "RECONCILED");
      if ((job.workshopProcessRuns || []).length === 0) {
        blockers.push(t("No process runs recorded for this fabrication order"));
      } else if (openRuns.length > 0) {
        blockers.push(`${openRuns.length} open/unreconciled process run(s)`);
      }

      const pendingSteps = (job.workshopRouteSteps || []).filter(
        (s) => !["DONE", "SKIPPED"].includes(s.status)
      );
      if (pendingSteps.length > 0) {
        blockers.push(`${pendingSteps.length} unresolved route step(s) pending`);
      }

      const jobTransfers = transfers.filter(
        (tr) => tr.treeId && (job.trees || []).some((tree) => tree.id === tr.treeId)
      );
      const pendingTransfers = jobTransfers.filter(
        (tr) => !["RECONCILED", "CANCELLED"].includes(tr.status)
      );
      if (pendingTransfers.length > 0) {
        blockers.push(`${pendingTransfers.length} inter-department transfer(s) awaiting receipt`);
      }

      return blockers;
    },
    [transfers, t]
  );

  const handleExecuteQc = async () => {
    if (!selectedJob) return;
    if (qcAction === "APPROVED" && getBlockersForJob(selectedJob).length > 0) {
      setQcError(t("Reconcile all process runs, route steps and transfers before QC approval"));
      return;
    }
    if (qcAction !== "APPROVED" && !qcReason.trim()) {
      setQcError(t("Rework or rejection requires an explicit reason"));
      return;
    }

    setSubmittingQc(true);
    setQcError(null);
    try {
      await workshopApi.inspectQc(selectedJob.id, {
        decision: qcAction,
        reason: qcReason.trim() || undefined,
      });

      const approvedJob = selectedJob;
      setSelectedJob(null);
      setQcReason("");
      loadData();

      if (qcAction === "APPROVED") {
        setReceiptJob(approvedJob);
      }
    } catch (err: any) {
      setQcError(
        err?.response?.data?.message || err?.message || t("QC inspection failed")
      );
    } finally {
      setSubmittingQc(false);
    }
  };

  const qcQueue = useMemo(() => {
    return jobs.filter((j) => j.currentStage === "QC" && !j.inventoryItemId &&
      !["CANCELLED", "REJECTED"].includes(j.status));
  }, [jobs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-border">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  <T>Quality Control & Final Goods Receipt</T>
                </h2>
                <Badge variant="outline" className="text-xs font-mono">
                  {qcQueue.length} <T>In Queue</T>
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                <T>
                  Verify physical mass balance, approve manufacturing standards, trigger controlled rework, or execute final scale goods receipt.
                </T>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button variant="outline" size="sm" onClick={loadData} className="text-xs h-8">
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              <T>Refresh</T>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QC Queue Grid */}
      <div className="space-y-3" data-tour="workshop-qc-queue">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-purple-500" />
          <T>Manufacturing Jobs Awaiting Inspection</T>
        </h3>

        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            <T>Loading QC queue…</T>
          </div>
        ) : qcQueue.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground"><T>Nothing is waiting for QC</T></h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                <T>Jobs appear here after production reaches the QC stage.</T>
              </p>
            </div>
            <Button size="sm" variant="outline" className="text-xs" asChild>
              <Link href={supplyChainHref("production")}><T>Open Production</T></Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {qcQueue.map((job) => {
              const blockers = getBlockersForJob(job);
              const canApproveJob = blockers.length === 0;

              return (
                <Card
                  key={job.id}
                  className={`border transition-all ${
                    canApproveJob
                      ? "border-emerald-300 dark:border-emerald-950/70 hover:shadow-md"
                      : "border-border opacity-95"
                  }`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground truncate">{job.product}</span>
                      <Badge
                        variant={canApproveJob ? "default" : "outline"}
                        className="text-[10px] font-mono capitalize"
                      >
                        {job.status}
                      </Badge>
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground font-mono">
                      <span><T>Artisan:</T> {job.artisan}</span>
                      <span><T>Qty:</T> {job.qty}</span>
                    </div>

                    {/* Blockers vs Ready Indicator */}
                    <div data-tour="workshop-qc-blockers">
                      {blockers.length > 0 ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 space-y-1 text-[11px] text-amber-900 dark:text-amber-200">
                          <div className="font-semibold flex items-center gap-1 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span><T>Approval Blocked</T></span>
                          </div>
                          <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground text-[10px]">
                            {blockers.map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span><T>All processes reconciled. Ready for QC decision.</T></span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center gap-2">
                      {canApprove && !job.stages?.some((stage) => stage.stage === "QC" && !!stage.qcApprovedAt) && (
                        <Button
                          size="sm"
                          className="w-full text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white font-medium"
                          onClick={() => {
                            setSelectedJob(job);
                            setQcAction("APPROVED");
                            setQcReason("");
                            setQcError(null);
                          }}
                          data-tour="workshop-qc-action"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                          <T>Inspect & Decide</T>
                        </Button>
                      )}

                      {job.inventoryItemId ? (
                        <Badge variant="outline" className="border-emerald-500 text-emerald-600 text-[10px] shrink-0">
                          <T>Stock Created</T>
                        </Badge>
                      ) : job.stages?.some((stage) => stage.stage === "QC" && !!stage.qcApprovedAt) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 shrink-0 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          onClick={() => setReceiptJob(job)}
                        >
                          <Package className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                          <T>Receipt</T>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* QC Decision Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              <span><T>QC Decision for</T> {selectedJob.product}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs mb-1.5 block"><T>Inspection Decision</T></Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={qcAction === "APPROVED" ? "default" : "outline"}
                    className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setQcAction("APPROVED")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    <T>Approve</T>
                  </Button>
                  <Button
                    type="button"
                    variant={qcAction === "REWORK" ? "default" : "outline"}
                    className="text-xs h-9 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => setQcAction("REWORK")}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    <T>Rework</T>
                  </Button>
                  <Button
                    type="button"
                    variant={qcAction === "REJECTED" ? "destructive" : "outline"}
                    className="text-xs h-9"
                    onClick={() => setQcAction("REJECTED")}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    <T>Reject</T>
                  </Button>
                </div>
              </div>

              {qcAction !== "APPROVED" && (
                <div>
                  <Label className="text-xs mb-1 block">
                    <T>Reason for Rework / Rejection</T> <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder={t("e.g. Porosity on shank, defective stone setting prongs")}
                    value={qcReason}
                    onChange={(e) => setQcReason(e.target.value)}
                  />
                </div>
              )}

              {qcError && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive flex items-start gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{qcError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedJob(null)}>
                <T>Cancel</T>
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleExecuteQc}
                disabled={submittingQc || (qcAction === "APPROVED" && getBlockersForJob(selectedJob).length > 0)}
              >
                {submittingQc ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                <T>Submit Decision</T>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Finished Goods Receipt Dialog */}
      <WorkshopFinishedReceiptDialog
        job={receiptJob}
        isOpen={!!receiptJob}
        onClose={() => setReceiptJob(null)}
        onSuccess={() => {
          loadData();
        }}
        canApprove={canApprove}
      />
    </div>
  );
}
