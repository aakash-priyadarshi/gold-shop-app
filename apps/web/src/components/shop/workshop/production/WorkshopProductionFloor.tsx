"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import {
  workshopApi,
  type WorkshopJob,
  type WorkshopProcessRun,
  type WorkshopProcessDefinition,
  type WorkshopMaterial,
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
  const [selectedDept, setSelectedDept] = useState<string>(initialDept || "ALL");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [activeMovementKind, setActiveMovementKind] = useState<string>("PROCESS_INPUT");
  const [selectedMaterialKey, setSelectedMaterialKey] = useState<string>("goldGrains995");
  const [runReport, setRunReport] = useState<RunReconciliationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Close run notes
  const [closeNotes, setCloseNotes] = useState("");
  const [closingRun, setClosingRun] = useState(false);

  const loadFloorData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, catRes] = await Promise.allSettled([
        workshopApi.jobs(),
        workshopApi.catalog(),
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
        setDefinitions(catRes.value.data?.definitions || []);
        setMaterials(catRes.value.data?.materials || []);
      }
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

  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    definitions.forEach((d) => {
      if (d.department) set.add(d.department);
    });
    return Array.from(set);
  }, [definitions]);

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

      {/* 3-Column Operator Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Queue of Jobs (3 Cols) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <T>Queue</T> ({departmentJobs.length})
            </h3>
            <Button variant="ghost" size="sm" onClick={loadFloorData} className="h-6 w-6 p-0">
              <RefreshCw className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {departmentJobs.map((job) => {
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
                    <span className="font-mono">Qty: {job.qty}</span>
                  </div>

                  {openRuns.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                      <Activity className="h-3 w-3 animate-pulse" />
                      <span>{openRuns.length} active process run</span>
                    </div>
                  )}
                </div>
              );
            })}
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
                      Job #{selectedJob.id.slice(0, 8)} · Metal: {selectedJob.metalKey || "goldGrains995"}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs capitalize">
                    {selectedJob.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Active Runs Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                      <T>Active Process Runs</T>
                    </Label>
                    <span className="text-xs text-muted-foreground font-mono">
                      {activeRunsForJob.length} open
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
                </div>

                {/* Run Reconciliation & Close Action */}
                {selectedRunId && runReport && (
                  <div className="rounded-xl border bg-muted/20 p-3 space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground"><T>Process Remainder</T></span>
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
                            {parseFloat(m.unclassifiedGrams).toFixed(3)}g unclassified
                          </span>
                        </div>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9"
                      onClick={handleCloseRun}
                      disabled={closingRun}
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
          <Card className="border-border">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Scale className="h-4 w-4 text-amber-500" />
                <T>Physical Movement & Weighing</T>
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
                    { kind: "PROCESS_INPUT", label: "Weighed Input" },
                    { kind: "PROCESS_OUTPUT", label: "Forward Output" },
                    { kind: "MIXED_OUTPUT", label: "Mixed Output" },
                    { kind: "RECOVERY_DEPOSIT", label: "Recovery Deposit" },
                    { kind: "STONE_SETTING", label: "Set Stone" },
                    { kind: "FINISHED_RECEIPT", label: "Finished Receipt" },
                  ].map((m) => (
                    <Button
                      key={m.kind}
                      type="button"
                      variant={activeMovementKind === m.kind ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-8 justify-start"
                      onClick={() => setActiveMovementKind(m.kind)}
                    >
                      {m.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Material Key Selector */}
              <div>
                <Label className="text-xs font-semibold block mb-1.5"><T>Physical Material</T></Label>
                <select
                  value={selectedMaterialKey}
                  onChange={(e) => setSelectedMaterialKey(e.target.value)}
                  className="w-full text-xs rounded-md border border-input bg-background p-2 font-mono"
                >
                  <option value="goldGrains995">Gold Grains 995</option>
                  <option value="masterAlloy">Master Alloy</option>
                  {materials.filter((m) => m.key !== "goldGrains995" && m.key !== "masterAlloy").map((m) => (
                    <option key={m.id} value={m.key}>
                      {m.name} ({m.key})
                    </option>
                  ))}
                </select>
              </div>

              {/* Authoritative Scale Capture Panel */}
              <ScaleCapturePanel
                purpose={activeMovementKind === "STONE_SETTING" ? "STONE" : "GOLD"}
                materialKey={selectedMaterialKey}
                treeId={primaryTree?.id || ""}
                movementKind={activeMovementKind}
                processRunId={selectedRunId || undefined}
                destinationBucket={
                  activeMovementKind === "PROCESS_OUTPUT" ? "WIP" :
                  activeMovementKind === "RECOVERY_DEPOSIT" ? "RECOVERY_PENDING" :
                  "WIP"
                }
                allowManualOverride={!staffMode && canApprove}
                canApprove={canApprove}
                onConfirmed={() => {
                  setActionSuccess(t("Physical weight confirmed and posted to ledger"));
                  loadFloorData();
                  setTimeout(() => setActionSuccess(null), 3500);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
