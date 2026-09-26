"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import {
  workshopApi,
  type WorkshopJob,
  type BatchReconciliationResponse,
  type WorkshopProcessRun,
  type WorkshopRouteStep,
  type WorkshopBatchChild,
} from "@/lib/workshop-api";
import { supplyChainHref } from "@/lib/workshop-route";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Flame,
  GitBranch,
  Layers,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Scale,
  Sparkles,
  Tag,
  User,
} from "lucide-react";
import { ReconciliationSummary } from "../shared/ReconciliationSummary";
import { WorkshopDomainTooltip } from "../shared/WorkshopDomainTooltip";

export interface WorkshopJobDetailViewProps {
  jobId: string;
  onBack?: () => void;
}

export function WorkshopJobDetailView({ jobId, onBack }: WorkshopJobDetailViewProps) {
  const t = useT();
  const [job, setJob] = useState<WorkshopJob | null>(null);
  const [reconciliation, setReconciliation] = useState<BatchReconciliationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);

  // New child dialog state
  const [showChildModal, setShowChildModal] = useState(false);
  const [childKind, setChildKind] = useState<"DESIGN_GROUP" | "ORDER_GROUP" | "PIECE">("DESIGN_GROUP");
  const [childLabel, setChildLabel] = useState("");
  const [childQuantity, setChildQuantity] = useState("1");
  const [childSubmitting, setChildSubmitting] = useState(false);
  const [childError, setChildError] = useState<string | null>(null);

  const loadJobData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await workshopApi.jobs();
      const found = (res.data || []).find((j) => j.id === jobId);
      if (found) {
        setJob(found);
        const primaryTree = found.trees?.[0];
        if (primaryTree) {
          setSelectedTreeId(primaryTree.id);
          try {
            const batchRes = await workshopApi.batchReport(primaryTree.id);
            setReconciliation(batchRes.data);
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadJobData();
  }, [loadJobData]);

  const handleCreateChild = async () => {
    if (!selectedTreeId || !childLabel.trim()) return;
    setChildSubmitting(true);
    setChildError(null);
    try {
      await workshopApi.createBatchChild({
        treeId: selectedTreeId,
        kind: childKind,
        label: childLabel.trim(),
        quantity: childKind === "PIECE" ? 1 : parseInt(childQuantity, 10) || 1,
      });
      setShowChildModal(false);
      setChildLabel("");
      setChildQuantity("1");
      loadJobData();
    } catch (err: any) {
      setChildError(err?.response?.data?.message || err?.message || t("Unable to create batch child"));
    } finally {
      setChildSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
        <T>Loading Manufacturing Job Record…</T>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rounded-xl border p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground"><T>Manufacturing job not found.</T></p>
        {onBack ? (
          <Button variant="outline" size="sm" onClick={onBack}><T>Back to Jobs</T></Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={supplyChainHref("jobs")}><T>Back to Jobs</T></Link>
          </Button>
        )}
      </div>
    );
  }

  const primaryTree = job.trees?.[0];

  return (
    <div className="space-y-6">
      {/* Back button & Action Row */}
      <div className="flex items-center justify-between">
        {onBack ? (
          <Button variant="ghost" size="sm" onClick={onBack} className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            <T>Back to All Jobs</T>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link href={supplyChainHref("jobs")}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              <T>Back to All Jobs</T>
            </Link>
          </Button>
        )}

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadJobData} className="text-xs h-8">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            <T>Refresh</T>
          </Button>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8" asChild>
            <Link href={supplyChainHref("production")}>
              <T>Open Production Floor</T>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </div>

      {/* 1. Header Information */}
      <Card className="border-border">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-foreground">{job.product}</h2>
                <Badge
                  variant={
                    job.status === "Completed"
                      ? "default"
                      : job.status === "QC"
                      ? "secondary"
                      : "outline"
                  }
                  className="font-mono text-xs capitalize"
                >
                  {job.status}
                </Badge>
                {job.inventoryItemId && (
                  <Badge variant="outline" className="border-emerald-500 text-emerald-600 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    <T>Inventory Item Created</T>
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                <T>Job #</T>{job.id.slice(0, 8)} · <T>Artisan:</T> {job.artisan} · <T>Qty:</T> {job.qty}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground block">
                <T>Reconciliation State</T>
              </span>
              <span
                className={`font-mono text-xs font-bold ${
                  reconciliation?.reconciliationState === "RECONCILED"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {reconciliation?.reconciliationState || "PENDING"}
              </span>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg border p-2.5 bg-muted/20">
              <span className="text-muted-foreground block text-[11px]"><T>Target Metal</T></span>
              <span className="font-semibold text-foreground text-sm font-mono">{job.metalKey || "goldGrains995"}</span>
            </div>
            <div className="rounded-lg border p-2.5 bg-muted/20">
              <span className="text-muted-foreground block text-[11px]"><T>Casting Trees</T></span>
              <span className="font-semibold text-foreground text-sm font-mono">{job.trees?.length || 0}</span>
            </div>
            <div className="rounded-lg border p-2.5 bg-muted/20">
              <span className="text-muted-foreground block text-[11px]"><T>Active Process Runs</T></span>
              <span className="font-semibold text-foreground text-sm font-mono">
                {job.workshopProcessRuns?.filter((r) => r.status === "OPEN").length || 0}
              </span>
            </div>
            <div className="rounded-lg border p-2.5 bg-muted/20">
              <span className="text-muted-foreground block text-[11px]"><T>Route Steps</T></span>
              <span className="font-semibold text-foreground text-sm font-mono">
                {job.workshopRouteSteps?.filter((s) => s.status === "DONE").length || 0} / {job.workshopRouteSteps?.length || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. CAD Expected vs Weighed Physical Material Issue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CAD / Expected */}
        <Card className="border-border" data-tour="workshop-job-theoretical">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm font-semibold"><T>Theoretical CAD Specifications</T></CardTitle>
              </div>
              <WorkshopDomainTooltip term="theoretical" />
            </div>
            <CardDescription className="text-xs">
              <T>Design reference weights from 3D CAD modeling</T>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground"><T>Theoretical CAD Weight</T></span>
              <span className="font-mono font-bold text-foreground">
                {reconciliation?.theoreticalCadGrams || "0.000000"} g
              </span>
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                <T>Tree Model Lines</T>
              </span>
              {primaryTree?.lines && primaryTree.lines.length > 0 ? (
                primaryTree.lines.map((line, idx) => (
                  <div key={line.id} className="flex justify-between text-muted-foreground font-mono">
                    <span><T>Line #</T>{idx + 1}</span>
                    <span>{line.weightGrams.toFixed(3)} g</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground italic"><T>No CAD line breakdown attached</T></p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Material Issue: Recommended vs Actual Scale */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm font-semibold"><T>Physical Material Issue</T></CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <WorkshopDomainTooltip term="recommended" />
                <WorkshopDomainTooltip term="actual" />
              </div>
            </div>
            <CardDescription className="text-xs">
              <T>Recommended alloy ratio vs Authoritative Gold Scale input</T>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs font-mono">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex justify-between items-center text-muted-foreground" data-tour="workshop-job-actual">
                <span><T>Total Actual Issued Input</T></span>
                <span className="font-bold text-foreground">
                  {reconciliation?.actualInputGrams || "0.000000"} g
                </span>
              </div>

              {/* Gold 995 comparison */}
              <div className="pt-2 border-t space-y-1" data-tour="workshop-job-recommended">
                <div className="flex justify-between text-muted-foreground">
                  <span><T>Recommended Gold 995</T>:</span>
                  <span>{reconciliation?.recommendedInputsByMaterial?.goldGrains995 || "0.000"} g</span>
                </div>
                <div className="flex justify-between text-foreground font-semibold">
                  <span><T>Actual Gold 995 (Scale)</T>:</span>
                  <span>{reconciliation?.actualInputsByMaterial?.goldGrains995 || "0.000"} g</span>
                </div>
              </div>

              {/* Master Alloy comparison */}
              <div className="pt-2 border-t space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span><T>Recommended Master Alloy</T>:</span>
                  <span>{reconciliation?.recommendedInputsByMaterial?.masterAlloy || "0.000"} g</span>
                </div>
                <div className="flex justify-between text-foreground font-semibold">
                  <span><T>Actual Master Alloy (Scale)</T>:</span>
                  <span>{reconciliation?.actualInputsByMaterial?.masterAlloy || "0.000"} g</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Dynamic Production Route & Process Timeline */}
      <Card className="border-border" data-tour="workshop-job-route">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold"><T>Process Route & Production Timeline</T></CardTitle>
            </div>
            <CardDescription className="text-xs">
              <T>Sequential manufacturing execution from casting to final QC</T>
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {(!job.workshopRouteSteps || job.workshopRouteSteps.length === 0) ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <T>No process route assigned yet.</T>
            </div>
          ) : (
            <div className="space-y-3">
              {job.workshopRouteSteps.map((step, idx) => {
                const stepRuns = (job.workshopProcessRuns || []).filter((r) => r.routeStepId === step.id);
                const isDone = step.status === "DONE";
                const isStarted = step.status === "STARTED";
                const isSkipped = step.status === "SKIPPED";

                return (
                  <div
                    key={step.id}
                    className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      isDone
                        ? "bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40"
                        : isStarted
                        ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-300 dark:border-amber-900/60 shadow-xs"
                        : "bg-muted/10 border-border text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : isStarted ? (
                          <Activity className="h-4 w-4 text-amber-600 animate-pulse" />
                        ) : (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-mono">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-xs">
                          {step.definition?.name || `Process Step #${idx + 1}`}
                          {step.definition?.department && (
                            <span className="text-muted-foreground font-normal"> · {step.definition.department}</span>
                          )}
                        </div>
                        {stepRuns.length > 0 && (
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {stepRuns.length} <T>run(s) · Last status:</T> {stepRuns[0].status}
                          </div>
                        )}
                        {step.reason && (
                          <div className="text-[10px] text-muted-foreground italic mt-0.5">
                            <T>Note:</T> {step.reason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Badge
                        variant={isDone ? "default" : isStarted ? "secondary" : "outline"}
                        className="text-[10px] font-mono capitalize"
                      >
                        {step.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Batch Children (Post-Cutting Split) */}
      <Card className="border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-sm font-semibold"><T>Batch Children & Segments</T></CardTitle>
            </div>
            <CardDescription className="text-xs">
              <T>Sub-divided pieces, design groupings, or order lines created after cutting</T>
            </CardDescription>
          </div>
          {primaryTree && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChildModal(true)}
              className="text-xs h-7"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              <T>Add Child</T>
            </Button>
          )}
        </CardHeader>

        <CardContent>
          {(!job.workshopBatchChildren || job.workshopBatchChildren.length === 0) ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              <T>No batch children created yet. Add individual pieces or design groups after the cutting process.</T>
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {job.workshopBatchChildren.map((child) => (
                <div key={child.id} className="rounded-xl border p-3 bg-muted/20 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">
                      {child.kind}
                    </Badge>
                    <span className="font-mono text-muted-foreground"><T>Qty:</T> {child.quantity}</span>
                  </div>
                  <div className="font-semibold text-foreground truncate mt-1">
                    {child.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Mass Balance Reconciliation */}
      {reconciliation && (
        <div data-tour="workshop-job-reconciliation">
          <ReconciliationSummary
            totalInputGrams={reconciliation.actualInputGrams}
            forwardWipGrams={reconciliation.outstandingWipGrams}
            unclassifiedGrams={reconciliation.unclassifiedGrams}
            reconciliationState={reconciliation.reconciliationState}
            varianceGrams={reconciliation.dispositions?.PROCESS_VARIANCE || "0"}
            reusableGrams={reconciliation.dispositions?.REUSABLE || "0"}
            scrapGrams={reconciliation.dispositions?.SCRAP || "0"}
            recoveryPendingGrams={reconciliation.dispositions?.RECOVERY_PENDING || "0"}
            refineryGrams={reconciliation.dispositions?.REFINERY || "0"}
          />
        </div>
      )}

      {/* Add Batch Child Modal */}
      {showChildModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-foreground"><T>Create Batch Child</T></h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block mb-1"><T>Child Kind</T></span>
                <select
                  value={childKind}
                  onChange={(e: any) => setChildKind(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2"
                >
                  <option value="DESIGN_GROUP">{t("Design Group")}</option>
                  <option value="ORDER_GROUP">{t("Order Group")}</option>
                  <option value="PIECE">{t("Individual Piece (Qty: 1)")}</option>
                </select>
              </div>

              <div>
                <span className="text-muted-foreground block mb-1"><T>Label / Code</T></span>
                <input
                  value={childLabel}
                  onChange={(e) => setChildLabel(e.target.value)}
                  placeholder={t("e.g. Ring #1 / Solitaire Batch")}
                  className="w-full rounded-md border border-input bg-background p-2"
                />
              </div>

              {childKind !== "PIECE" && (
                <div>
                  <span className="text-muted-foreground block mb-1"><T>Quantity</T></span>
                  <input
                    type="number"
                    min="1"
                    value={childQuantity}
                    onChange={(e) => setChildQuantity(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2 font-mono"
                  />
                </div>
              )}
            </div>

            {childError && <p role="alert" className="text-xs text-destructive">{childError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowChildModal(false)}>
                <T>Cancel</T>
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleCreateChild}
                disabled={childSubmitting || !childLabel.trim()}
              >
                {childSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <T>Create Child</T>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
