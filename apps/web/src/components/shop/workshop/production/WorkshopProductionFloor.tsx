"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import {
  workshopApi,
  type WorkshopJob,
  type WorkshopProcessRun,
  type WorkshopProcessDefinition,
  type WorkshopMaterial,
  type WorkshopRecoveryContainer,
  type RunReconciliationResponse,
} from "@/lib/workshop-api";
import {
  Activity,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Flame,
  Layers,
  Loader2,
  Package,
  Play,
  Plus,
  RefreshCw,
  Scale,
  Sparkles,
  StopCircle,
  Truck,
  Users,
} from "lucide-react";
import { ScaleCapturePanel } from "../shared/ScaleCapturePanel";
import { WorkshopCreateJobDialog } from "../jobs/WorkshopCreateJobDialog";
import { WorkshopDomainTooltip } from "../shared/WorkshopDomainTooltip";
import Link from "next/link";
import { supplyChainHref } from "@/lib/workshop-route";

export interface WorkshopProductionFloorProps {
  initialDept?: string | null;
  staffMode?: boolean;
  canApprove?: boolean;
}

export function WorkshopProductionFloor({
  initialDept,
  staffMode = false,
  canApprove = true,
}: WorkshopProductionFloorProps) {
  const t = useT();
  const [jobs, setJobs] = useState<WorkshopJob[]>([]);
  const [definitions, setDefinitions] = useState<WorkshopProcessDefinition[]>([]);
  const [materials, setMaterials] = useState<WorkshopMaterial[]>([]);
  const [recoveryBags, setRecoveryBags] = useState<WorkshopRecoveryContainer[]>([]);
  const [selectedRecoveryBagId, setSelectedRecoveryBagId] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>(initialDept || "ALL");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [activeMovementKind, setActiveMovementKind] = useState<string>("PROCESS_INPUT");
  const [selectedMaterialKey, setSelectedMaterialKey] = useState<string>("goldGrains995");
  const [runReport, setRunReport] = useState<RunReconciliationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [createJobOpen, setCreateJobOpen] = useState(false);

  // Close run notes
  const [closeNotes, setCloseNotes] = useState("");
  const [closingRun, setClosingRun] = useState(false);
  const [classifyMaterialKey, setClassifyMaterialKey] = useState("");
  const [classificationReason, setClassificationReason] = useState("");
  const [classifying, setClassifying] = useState(false);

  useEffect(() => {
    setSelectedRunId("");
    setRunReport(null);
    setCloseNotes("");
    setClassifyMaterialKey("");
    setClassificationReason("");
  }, [selectedJobId]);

  const expectedPurpose = ["STONE_SETTING", "STONE_RETURN"].includes(activeMovementKind) ? "STONE" : "GOLD";
  const activeMovementMaterials = useMemo(
    () => materials.filter((m) => m.isActive && m.scalePurpose === expectedPurpose),
    [materials, expectedPurpose]
  );

  useEffect(() => {
    if (activeMovementMaterials.length > 0) {
      if (!activeMovementMaterials.some((m) => m.key === selectedMaterialKey)) {
        setSelectedMaterialKey(activeMovementMaterials[0].key);
      }
    } else {
      setSelectedMaterialKey("");
    }
  }, [activeMovementMaterials, selectedMaterialKey]);

  useEffect(() => {
    if (selectedRecoveryBagId) {
      const currentBag = recoveryBags.find((b) => b.id === selectedRecoveryBagId);
      if (!currentBag || currentBag.materialKey !== selectedMaterialKey) {
        setSelectedRecoveryBagId("");
      }
    }
  }, [selectedMaterialKey, selectedRecoveryBagId, recoveryBags]);

  const loadFloorData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, catRes, bagsRes] = await Promise.allSettled([
        workshopApi.jobs(),
        workshopApi.catalog(),
        workshopApi.recoveryBags(),
      ]);

      if (jobsRes.status === "fulfilled") {
        const jList = jobsRes.value.data || [];
        setJobs(jList);
        if (jList.length && !selectedJobId) {
          const firstOpen = jList.find((j) => !["Completed", "CANCELLED", "REJECTED"].includes(j.status));
          if (firstOpen) setSelectedJobId(firstOpen.id);
        }
      }

      if (catRes.status === "fulfilled") {
        setDefinitions(catRes.value.data?.processes || []);
        setMaterials(catRes.value.data?.materials || []);
      }
      if (bagsRes.status === "fulfilled") setRecoveryBags(bagsRes.value.data || []);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    loadFloorData();
  }, [loadFloorData]);

  // Load reconciliation when selected run changes
  useEffect(() => {
    if (!selectedRunId) {
      setRunReport(null);
      return;
    }
    workshopApi
      .runReport(selectedRunId)
      .then((res) => setRunReport(res.data))
      .catch(() => setRunReport(null));
  }, [selectedRunId]);

  useEffect(() => {
    setClassifyMaterialKey(runReport?.materials.find((m) => parseFloat(m.unclassifiedGrams) > 0)?.materialKey || "");
  }, [runReport]);

  const refreshRunReport = () => {
    if (selectedRunId) workshopApi.runReport(selectedRunId).then((res) => setRunReport(res.data)).catch(() => setRunReport(null));
  };

  const handleClassify = async () => {
    if (!selectedRunId || !classifyMaterialKey || !classificationReason.trim()) return;
    setClassifying(true);
    try {
      await workshopApi.classifyRun(selectedRunId, classifyMaterialKey, classificationReason.trim());
      setClassificationReason("");
      refreshRunReport();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || t("Unable to classify process remainder"));
    } finally {
      setClassifying(false);
    }
  };

  const selectedJob = useMemo(() => {
    return jobs.find((j) => j.id === selectedJobId) || null;
  }, [jobs, selectedJobId]);

  const primaryTree = useMemo(() => {
    return selectedJob?.trees?.[0] || null;
  }, [selectedJob]);


  // Filter jobs by selected department if not ALL
  const departmentJobs = useMemo(() => {
    if (selectedDept === "ALL") return jobs.filter((j) => !["Completed", "CANCELLED", "REJECTED"].includes(j.status));
    return jobs.filter((j) => {
      if (["Completed", "CANCELLED", "REJECTED"].includes(j.status)) return false;
      const runs = j.workshopProcessRuns || [];
      const steps = j.workshopRouteSteps || [];
      return (
        runs.some((r) => r.department === selectedDept || r.definition?.department === selectedDept) ||
        steps.some((s) => s.definition?.department === selectedDept)
      );
    });
  }, [jobs, selectedDept]);

  const activeRunsForJob = useMemo(() => {
    if (!selectedJob) return [];
    return (selectedJob.workshopProcessRuns || []).filter(
      (r) => r.status === "OPEN" || r.status === "RECONCILIATION_PENDING"
    );
  }, [selectedJob]);

  const selectedRun = activeRunsForJob.find((run) => run.id === selectedRunId);

  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    definitions.forEach((d) => {
      if (d.department) set.add(d.department);
    });
    return Array.from(set);
  }, [definitions]);

  useEffect(() => {
    setSelectedDept(initialDept && departmentsList.includes(initialDept) ? initialDept : "ALL");
  }, [initialDept, departmentsList]);

  // Handle Starting a Process Run
  const handleStartRun = async (defId: string) => {
    if (!primaryTree) return;
    try {
      const res = await workshopApi.startRun({
        treeId: primaryTree.id,
        definitionId: defId,
      });
      loadFloorData();
      setSelectedRunId(res.data.id);
      setActionSuccess(t("Process run started successfully"));
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to start run");
    }
  };

  // Handle Closing Run
  const handleCloseRun = async () => {
    if (!selectedRunId) return;
    setClosingRun(true);
    try {
      await workshopApi.closeRun(selectedRunId, closeNotes.trim() || undefined);
      setSelectedRunId("");
      setCloseNotes("");
      loadFloorData();
      setActionSuccess(t("Process run completed & reconciled successfully"));
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Cannot close run. Resolve remainder first.");
    } finally {
      setClosingRun(false);
    }
  };

  const needsRun = ["ADDITIONAL_ISSUE", "PROCESS_INPUT", "PROCESS_OUTPUT", "MIXED_OUTPUT", "RECOVERY_DEPOSIT"].includes(activeMovementKind);
  const selectedBag = recoveryBags.find(
    (bag) => bag.id === selectedRecoveryBagId && bag.status === "OPEN" && bag.materialKey === selectedMaterialKey
  );
  const movementMaterialKey = activeMovementKind === "MIXED_OUTPUT" && selectedRun
    ? `mix_${selectedRun.id.replace(/-/g, "")}` : selectedMaterialKey;
  const manualBuckets = (() => {
    const treeScope = primaryTree?.id;
    const runScope = selectedRunId || undefined;
    switch (activeMovementKind) {
      case "MATERIAL_ISSUE": return { sourceBucket: "VAULT", destinationBucket: "WIP", destinationScopeId: treeScope };
      case "ADDITIONAL_ISSUE": return { sourceBucket: "VAULT", destinationBucket: "PROCESS", destinationScopeId: runScope };
      case "PROCESS_INPUT": return { sourceBucket: "WIP", sourceScopeId: treeScope, destinationBucket: "PROCESS", destinationScopeId: runScope };
      case "PROCESS_OUTPUT": return { sourceBucket: "PROCESS", sourceScopeId: runScope, destinationBucket: "WIP", destinationScopeId: treeScope };
      case "STONE_SETTING": return { sourceBucket: "VAULT", destinationBucket: runScope ? "PROCESS" : "WIP", destinationScopeId: runScope || treeScope };
      case "STONE_RETURN": return { sourceBucket: runScope ? "PROCESS" : "WIP", sourceScopeId: runScope || treeScope, destinationBucket: "VAULT" };
      default: return null;
    }
  })();

  return (
    <div className="space-y-4">
      {/* Department Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Button
          variant={selectedDept === "ALL" ? "default" : "outline"}
          size="sm"
          className="text-xs h-8 shrink-0 font-medium"
          onClick={() => setSelectedDept("ALL")}
        >
          <T>All Departments</T>
        </Button>
        {departmentsList.map((dept) => (
          <Button
            key={dept}
            variant={selectedDept === dept ? "default" : "outline"}
            size="sm"
            className="text-xs h-8 shrink-0 font-medium"
            onClick={() => setSelectedDept(dept)}
          >
            {dept}
          </Button>
        ))}
      </div>

      {actionSuccess && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Empty State when no jobs exist on floor */}
      {!loading && jobs.length === 0 ? (
        <Card className="border-dashed p-10 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600">
            <Package className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              <T>No active manufacturing jobs</T>
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              <T>Create a job first, then return here to run its factory processes.</T>
            </p>
          </div>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
            onClick={() => setCreateJobOpen(true)}
            data-tour="workshop-production-create-job"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <T>Create Job</T>
          </Button>
        </Card>
      ) : (
        /* 3-Column Operator Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT COLUMN: Queue of Jobs (3 Cols) */}
          <div className="lg:col-span-3 space-y-3" data-tour="workshop-production-queue">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <T>Queue</T> ({departmentJobs.length})
              </h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] px-2 text-amber-600 hover:text-amber-700"
                  onClick={() => setCreateJobOpen(true)}
                  data-tour="workshop-production-create-job"
                >
                  <Plus className="h-3 w-3 mr-0.5" />
                  <T>Job</T>
                </Button>
                <Button variant="ghost" size="sm" onClick={loadFloorData} className="h-6 w-6 p-0">
                  <RefreshCw className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {departmentJobs.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground space-y-2">
                  <p><T>No jobs match this department filter.</T></p>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setSelectedDept("ALL")}>
                    <T>Show All</T>
                  </Button>
                </div>
              ) : (
                departmentJobs.map((job) => {
                  const isSelected = job.id === selectedJobId;
                  const openRuns = (job.workshopProcessRuns || []).filter((r) => r.status === "OPEN");

                  return (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`rounded-xl border p-3 cursor-pointer transition-all ${
                        isSelected
                          ? "border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm"
                          : "border-border bg-card hover:border-amber-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground truncate">{job.product}</span>
                        <Badge variant={isSelected ? "default" : "outline"} className="text-[10px] font-mono">
                          #{job.id.slice(0, 6)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                        <span>{job.artisan}</span>
                        <span className="font-mono"><T>Qty:</T> {job.qty}</span>
                      </div>

                      {openRuns.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                          <Activity className="h-3 w-3 animate-pulse" />
                          <span>{openRuns.length} <T>active process run</T></span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CENTER COLUMN: Selected Job & Active Process Workflow (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {selectedJob ? (
              <Card className="border-border shadow-xs">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">
                        {selectedJob.product}
                      </CardTitle>
                      <CardDescription className="text-xs font-mono">
                        <T>Job #</T>{selectedJob.id.slice(0, 8)} · <T>Metal:</T> {selectedJob.metalKey || "goldGrains995"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs capitalize">
                      {selectedJob.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Active Runs Selector */}
                  <div className="space-y-2" data-tour="workshop-production-process">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                        <T>Active Process Runs</T>
                      </Label>
                      <span className="text-xs text-muted-foreground font-mono">
                        {activeRunsForJob.length} <T>open</T>
                      </span>
                    </div>

                    {activeRunsForJob.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                        <T>No process run in progress for this job. Start a process below.</T>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {activeRunsForJob.map((run) => (
                          <div
                            key={run.id}
                            onClick={() => setSelectedRunId(run.id)}
                            className={`rounded-lg border p-2.5 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                              selectedRunId === run.id
                                ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 font-semibold"
                                : "border-border hover:bg-muted/40"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-amber-500" />
                              <span>{run.definition?.name || run.department}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {run.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Start New Process Run */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                      <T>Start Factory Process</T>
                    </Label>
                    {definitions.length === 0 ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-center space-y-2 text-xs">
                        <p className="text-amber-800 dark:text-amber-300">
                          <T>No factory processes configured yet.</T>
                        </p>
                        <Button size="sm" variant="outline" className="text-xs h-7" asChild>
                          <Link href={supplyChainHref("settings")}><T>Configure Factory</T></Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {definitions.slice(0, 6).map((def) => (
                          <Button
                            key={def.id}
                            variant="outline"
                            size="sm"
                            className="text-xs h-9 justify-start"
                            onClick={() => handleStartRun(def.id)}
                          >
                            <Play className="h-3 w-3 mr-1.5 text-amber-600" />
                            <span className="truncate">{def.name}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Run Reconciliation & Close Action */}
                  {selectedRunId && runReport && (
                    <div className="rounded-xl border bg-muted/20 p-3 space-y-3 pt-3 border-t" data-tour="workshop-production-remainder">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <T>Process Remainder</T>
                          <WorkshopDomainTooltip term="processVariance" />
                        </div>
                        <Badge
                          variant={runReport.reconciliationState === "RECONCILED" ? "default" : "destructive"}
                          className="text-[10px] font-mono"
                        >
                          {runReport.reconciliationState}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs font-mono">
                        {runReport.materials.map((m) => (
                          <div key={m.materialKey} className="flex justify-between items-center text-muted-foreground">
                            <span>{m.materialKey}:</span>
                            <span className={parseFloat(m.unclassifiedGrams) > 0 ? "text-rose-600 font-bold" : "text-emerald-600"}>
                              {parseFloat(m.unclassifiedGrams).toFixed(3)}g <T>unclassified</T>
                            </span>
                          </div>
                        ))}
                      </div>

                      {canApprove && runReport.materials.some((m) => parseFloat(m.unclassifiedGrams) > 0) && (
                        <div className="space-y-2 border-t pt-2">
                          <Label className="text-xs"><T>Classify process remainder</T></Label>
                          <select value={classifyMaterialKey} onChange={(e) => setClassifyMaterialKey(e.target.value)} className="w-full rounded-md border bg-background p-2 text-xs">
                            {runReport.materials.filter((m) => parseFloat(m.unclassifiedGrams) > 0).map((m) => <option key={m.materialKey} value={m.materialKey}>{m.materialKey}</option>)}
                          </select>
                          <Input value={classificationReason} onChange={(e) => setClassificationReason(e.target.value)} placeholder={t("Verified reason for remainder")} />
                          <Button size="sm" variant="outline" disabled={classifying || !classifyMaterialKey || !classificationReason.trim()} onClick={handleClassify}><T>Classify remainder</T></Button>
                        </div>
                      )}

                      <Button
                        size="sm"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9"
                        onClick={handleCloseRun}
                        disabled={closingRun}
                        data-tour="workshop-production-close"
                      >
                        {closingRun ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <StopCircle className="h-4 w-4 mr-1" />}
                        <T>Close & Complete Process Run</T>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="rounded-xl border border-dashed p-12 text-center text-xs text-muted-foreground">
                <T>Select a job from the queue to start factory operations.</T>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Touch-friendly Scale & Weighing Movements (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-border" data-tour="workshop-production-scale">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-amber-500" />
                    <T>Physical Movement & Weighing</T>
                  </div>
                  <div className="flex items-center gap-1">
                    <WorkshopDomainTooltip term="stableNet" />
                    <WorkshopDomainTooltip term="capture" />
                    <WorkshopDomainTooltip term="confirm" />
                  </div>
                </CardTitle>
                <CardDescription className="text-xs">
                  <T>Select movement action then capture authoritative scale grams</T>
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Movement Kind Selector */}
                <div>
                  <Label className="text-xs font-semibold block mb-1.5"><T>Movement Action</T></Label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {[
                      { kind: "MATERIAL_ISSUE", label: "Issue material" },
                      { kind: "ADDITIONAL_ISSUE", label: "Additional issue" },
                      { kind: "PROCESS_INPUT", label: "Weighed Input" },
                      { kind: "PROCESS_OUTPUT", label: "Forward Output" },
                      { kind: "MIXED_OUTPUT", label: "Mixed Output" },
                      { kind: "RECOVERY_DEPOSIT", label: "Recovery Deposit" },
                      { kind: "STONE_SETTING", label: "Set Stone" },
                      { kind: "STONE_RETURN", label: "Return Stone" },
                    ].map((m) => (
                      <Button
                        key={m.kind}
                        type="button"
                        variant={activeMovementKind === m.kind ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-8 justify-start"
                        onClick={() => {
                          setActiveMovementKind(m.kind);
                          if (m.kind === "STONE_SETTING" || m.kind === "STONE_RETURN") {
                            setSelectedMaterialKey(materials.find((material) => material.isActive && material.scalePurpose === "STONE")?.key || "");
                          } else if (activeMovementKind === "STONE_SETTING" || activeMovementKind === "STONE_RETURN") {
                            setSelectedMaterialKey(materials.find((material) => material.isActive && material.scalePurpose === "GOLD")?.key || "goldGrains995");
                          }
                        }}
                      >
                        <T>{m.label}</T>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Material Key Selector */}
                <div data-tour="workshop-production-material">
                  <Label className="text-xs font-semibold block mb-1.5"><T>Physical Material</T></Label>
                  {activeMovementMaterials.length === 0 && activeMovementKind !== "MIXED_OUTPUT" ? (
                    <p className="text-xs text-amber-600 py-1"><T>No active materials available for this movement.</T></p>
                  ) : (
                    <select
                      value={selectedMaterialKey}
                      onChange={(e) => {
                        const newKey = e.target.value;
                        setSelectedMaterialKey(newKey);
                        const currentBag = recoveryBags.find((b) => b.id === selectedRecoveryBagId);
                        if (!currentBag || currentBag.materialKey !== newKey) {
                          setSelectedRecoveryBagId("");
                        }
                      }}
                      disabled={activeMovementKind === "MIXED_OUTPUT"}
                      className="w-full text-xs rounded-md border border-input bg-background p-2 font-mono"
                    >
                      {activeMovementMaterials.map((m) => (
                        <option key={m.id} value={m.key}>
                          {m.name} ({m.key})
                        </option>
                      ))}
                    </select>
                  )}
                  {activeMovementKind === "MIXED_OUTPUT" && <p className="text-xs text-muted-foreground font-mono">{movementMaterialKey}</p>}
                </div>

                {activeMovementKind === "RECOVERY_DEPOSIT" && (
                  <div>
                    <Label><T>Recovery bag</T></Label>
                    <select
                      value={selectedRecoveryBagId}
                      onChange={(e) => setSelectedRecoveryBagId(e.target.value)}
                      className="w-full rounded-md border bg-background p-2 text-xs"
                    >
                      <option value=""><T>Select open bag</T></option>
                      {recoveryBags.filter((bag) => bag.status === "OPEN" && bag.materialKey === selectedMaterialKey).map((bag) => (
                        <option key={bag.id} value={bag.id}>{bag.code}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(!primaryTree || (needsRun && !selectedRun) || (activeMovementKind === "RECOVERY_DEPOSIT" && !selectedBag) || (activeMovementKind === "MIXED_OUTPUT" && !selectedRun?.recipeId) || (activeMovementKind !== "MIXED_OUTPUT" && (!selectedMaterialKey || !activeMovementMaterials.some((m) => m.key === selectedMaterialKey)))) ? (
                  <p className="text-xs text-amber-700"><T>Select a matching casting tree, active process run, recipe or recovery bag before weighing.</T></p>
                ) : (
                <ScaleCapturePanel
                  key={`${selectedJobId}:${selectedRunId}:${activeMovementKind}:${selectedMaterialKey}`}
                  purpose={materials.find((m) => m.key === selectedMaterialKey)?.scalePurpose || "GOLD"}
                  materialKey={movementMaterialKey}
                  treeId={primaryTree?.id || ""}
                  jobId={selectedJobId || undefined}
                  movementKind={activeMovementKind}
                  processRunId={activeMovementKind === "MATERIAL_ISSUE" ? undefined : selectedRunId || undefined}
                  recoveryContainerId={activeMovementKind === "RECOVERY_DEPOSIT" ? selectedBag?.id : undefined}
                  destinationBucket={manualBuckets?.destinationBucket || (
                    activeMovementKind === "PROCESS_OUTPUT" ? "WIP" :
                    activeMovementKind === "RECOVERY_DEPOSIT" ? "RECOVERY_PENDING" :
                    "WIP"
                  )}
                  sourceBucket={manualBuckets?.sourceBucket}
                  sourceScopeId={manualBuckets?.sourceScopeId}
                  destinationScopeId={manualBuckets?.destinationScopeId}
                  allowManualOverride={!staffMode && canApprove && !!manualBuckets}
                  canApprove={canApprove}
                  onConfirmed={() => {
                    setActionSuccess(t("Physical weight confirmed and posted to ledger"));
                    loadFloorData();
                    refreshRunReport();
                    setTimeout(() => setActionSuccess(null), 3500);
                  }}
                />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Shared Job Creation Dialog */}
      <WorkshopCreateJobDialog
        open={createJobOpen}
        onOpenChange={setCreateJobOpen}
        onJobCreated={() => {
          loadFloorData();
        }}
      />
    </div>
  );
}
