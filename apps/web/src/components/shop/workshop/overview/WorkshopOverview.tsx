"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import {
  workshopApi,
  type WorkshopJob,
  type WorkshopProcessRun,
  type WorkshopAccount,
  type WorkshopTransfer,
  type WorkshopRecoveryContainer,
  type WorkshopProcessDefinition,
  type WorkshopCatalogResponse,
  type WorkshopReportsResponse,
} from "@/lib/workshop-api";
import { supplyChainHref } from "@/lib/workshop-route";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Coins,
  Cpu,
  Flame,
  GitBranch,
  Layers,
  Loader2,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import { MaterialBalanceCard } from "../shared/MaterialBalanceCard";
import { ExceptionBanner, type WorkshopException } from "../shared/ExceptionBanner";
import { WorkshopOnboardingChecklist, type WorkshopSetupStatus } from "../onboarding/WorkshopOnboardingChecklist";

export function WorkshopOverview() {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<WorkshopJob[]>([]);
  const [accounts, setAccounts] = useState<WorkshopAccount[]>([]);
  const [transfers, setTransfers] = useState<WorkshopTransfer[]>([]);
  const [bags, setBags] = useState<WorkshopRecoveryContainer[]>([]);
  const [definitions, setDefinitions] = useState<WorkshopProcessDefinition[]>([]);
  const [catalog, setCatalog] = useState<WorkshopCatalogResponse | null>(null);
  const [reports, setReports] = useState<WorkshopReportsResponse | null>(null);
  const [cutover, setCutover] = useState<any>(null);
  const [hasStaff, setHasStaff] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, accRes, trRes, bagRes, catRes, repRes, cutRes, staffRes] = await Promise.allSettled([
        workshopApi.jobs(),
        workshopApi.accounts(),
        workshopApi.transfers(),
        workshopApi.recoveryBags(),
        workshopApi.catalog(),
        workshopApi.reports(),
        workshopApi.cutoverStatus(),
        workshopApi.staff(),
      ]);

      if (jobsRes.status === "fulfilled") setJobs(jobsRes.value.data || []);
      if (accRes.status === "fulfilled") setAccounts(accRes.value.data || []);
      if (trRes.status === "fulfilled") setTransfers(trRes.value.data || []);
      if (bagRes.status === "fulfilled") setBags(bagRes.value.data || []);
      if (catRes.status === "fulfilled") {
        setCatalog(catRes.value.data);
        setDefinitions(catRes.value.data?.processes || []);
      }
      if (repRes.status === "fulfilled") setReports(repRes.value.data || null);
      if (cutRes.status === "fulfilled") setCutover(cutRes.value.data || null);
      setHasStaff(staffRes.status === "fulfilled" && staffRes.value.data.length > 0);
    } catch {
      // handled by individual settle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derive KPIs
  const activeJobs = useMemo(
    () => jobs.filter((j) => !["Completed", "CANCELLED", "REJECTED"].includes(j.status)),
    [jobs]
  );

  const activeRuns = useMemo(() => {
    return jobs.flatMap((j) => (j.workshopProcessRuns || []).filter((r) => r.status === "OPEN" || r.status === "RECONCILIATION_PENDING"));
  }, [jobs]);

  const awaitingTransfers = useMemo(
    () => transfers.filter((t) => t.status === "DISPATCHED" || t.status === "EXCEPTION"),
    [transfers]
  );

  const pendingRecovery = useMemo(
    () => bags.filter((b) => b.status === "OPEN" && parseFloat(b.expectedBalanceGrams || "0") > 0),
    [bags]
  );

  const qcPendingJobs = useMemo(
    () => jobs.filter((j) => j.currentStage === "QC" && !j.inventoryItemId),
    [jobs]
  );

  // Derive Exceptions
  const exceptions: WorkshopException[] = useMemo(() => {
    const list: WorkshopException[] = [];

    // 1. Transfer exceptions
    transfers
      .filter((tr) => tr.status === "EXCEPTION")
      .forEach((tr) => {
        list.push({
          id: `transfer-exc-${tr.id}`,
          title: t("Transfer Variance Above Tolerance"),
          description: `${tr.fromDepartment} → ${tr.toDepartment} (${tr.materialKey}): Difference of ${parseFloat(tr.differenceGrams || "0").toFixed(3)}g exceeds rule limit`,
          severity: "CRITICAL",
          category: "TRANSFER",
          actionHref: supplyChainHref("transfers"),
          actionLabel: "Review Transfer",
        });
      });

    // 2. Unclassified process runs awaiting supervisor
    if (reports?.process) {
      reports.process
        .filter((r) => r.unclassified && r.unclassified.some((u) => parseFloat(u.balanceGrams || "0") > 0))
        .forEach((r) => {
          const totalUnclass = r.unclassified?.reduce((sum, u) => sum + parseFloat(u.balanceGrams || "0"), 0) || 0;
          list.push({
            id: `run-unclass-${r.id}`,
            title: t("Process Remainder Awaiting Classification"),
            description: `${r.definition?.name || r.department}: ${totalUnclass.toFixed(3)}g physical remainder must be reconciled or approved`,
            severity: "CRITICAL",
            category: "PROCESS",
            actionHref: supplyChainHref("production"),
            actionLabel: "Inspect Run",
          });
        });
    }

    // 3. Recovery events awaiting reconciliation
    bags
      .flatMap((b) => (b.events || []).map((e) => ({ ...e, bagCode: b.code })))
      .filter((e) => e.status === "SENT")
      .forEach((e) => {
        list.push({
          id: `recovery-sent-${e.id}`,
          title: t("Refinery Recovery Event Awaiting Final Settlement"),
          description: `Bag ${e.bagCode}: Material sent to refinery; record assay and classify recovered metal`,
          severity: "WARNING",
          category: "RECOVERY",
          actionHref: supplyChainHref("recovery"),
          actionLabel: "Reconcile Recovery",
        });
      });

    // 4. Finished Jobs awaiting receipt
    qcPendingJobs
      .filter((j) => !j.inventoryItemId)
      .forEach((j) => {
        list.push({
          id: `qc-job-${j.id}`,
          title: t("Approved Fabrication Job Awaiting Scale Receipt"),
          description: `${j.product} (${j.artisan}): Ready for authoritative gross jewellery weigh-in and catalog stock creation`,
          severity: "INFO",
          category: "RECEIPT",
          actionHref: supplyChainHref("qc"),
          actionLabel: "Finished Receipt",
        });
      });

    // 5. Recent manual overrides
    if (reports?.scaleAudit) {
      const recentOverrides = reports.scaleAudit.filter((s) => s.journalId && s.referenceType === "MANUAL_OVERRIDE");
      if (recentOverrides.length > 0) {
        list.push({
          id: "recent-overrides",
          title: t("Physical Scale Manual Override Recently Used"),
          description: `${recentOverrides.length} transaction(s) posted with manual typed grams bypassing scale hardware`,
          severity: "WARNING",
          category: "OVERRIDE",
          actionHref: supplyChainHref("reports"),
          actionLabel: "Audit Overrides",
        });
      }
    }

    return list;
  }, [transfers, reports, bags, qcPendingJobs, t]);

  // Dynamic Pipeline: count jobs by process definition
  const pipeline = useMemo(() => {
    if (!definitions.length) return [];
    return definitions.map((def) => {
      const matchingRuns = activeRuns.filter((r) => r.definitionId === def.id);
      return {
        id: def.id,
        name: def.name,
        department: def.department || def.name,
        runCount: matchingRuns.length,
        runs: matchingRuns,
      };
    });
  }, [definitions, activeRuns]);

  // Traceable Metal Position Aggregation
  const metalPosition = useMemo(() => {
    const vaultAccounts = accounts.filter((a) => a.bucket === "VAULT");
    const wipAccounts = accounts.filter((a) => a.bucket === "WIP");
    const reusableAccounts = accounts.filter((a) => a.bucket === "REUSABLE");
    const scrapAccounts = accounts.filter((a) => a.bucket === "SCRAP");
    const recoveryAccounts = accounts.filter((a) => a.bucket === "RECOVERY_PENDING");
    const refineryAccounts = accounts.filter((a) => a.bucket === "REFINERY");
    const transitAccounts = accounts.filter((a) => a.bucket === "TRANSIT");
    const varianceAccounts = accounts.filter((a) => a.bucket === "PROCESS_VARIANCE");

    return {
      vault: vaultAccounts,
      wip: wipAccounts,
      reusable: reusableAccounts,
      scrap: scrapAccounts,
      recovery: recoveryAccounts,
      refinery: refineryAccounts,
      transit: transitAccounts,
      variance: varianceAccounts,
    };
  }, [accounts]);

  // Setup checklist evaluation
  const setupStatus: WorkshopSetupStatus = useMemo(() => {
    return {
      isTraceableLedger: cutover?.workshopLedgerVersion === "TRACEABLE",
      hasOpeningBalance: !!cutover?.hasOpeningBalance,
      hasGoldScale: !!catalog?.devices.some((device) => device.isActive && device.purpose === "GOLD"),
      hasStoneScale: !!catalog?.devices.some((device) => device.isActive && device.purpose === "STONE"),
      hasMaterials: !!catalog?.materials.some((material) => material.isActive),
      hasRecipes: !!catalog?.recipes.some((recipe) => recipe.isActive),
      hasProcesses: !!catalog?.processes.some((process) => process.isActive),
      hasRoutes: !!catalog?.routes.some((route) => route.isActive),
      hasWorkstations: !!catalog?.workstations.some((workstation) => workstation.isActive),
      hasTolerances: !!catalog?.tolerances.some((rule) => rule.isActive),
      hasStaff,
    };
  }, [cutover, catalog, hasStaff]);

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
        <T>Loading Manufacturing Operating Center…</T>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Onboarding Checklist if setup is incomplete */}
      <WorkshopOnboardingChecklist status={setupStatus} />

      {/* Top Operating KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-border">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Boxes className="h-3.5 w-3.5 text-blue-500" />
              <T>Active Jobs</T>
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {activeJobs.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-amber-500" />
              <T>Active Runs</T>
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {activeRuns.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-cyan-500" />
              <T>In Transit</T>
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {awaitingTransfers.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              <T>Recovery Bags</T>
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {pendingRecovery.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <T>QC Pending</T>
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {qcPendingJobs.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-3.5 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
              <T>Exceptions</T>
            </div>
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {exceptions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Required: Exception Priority Banner */}
      <ExceptionBanner exceptions={exceptions} />

      {/* Production Pipeline Visualization */}
      <Card className="border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-amber-500" />
              <T>Production Pipeline Visualization</T>
            </CardTitle>
            <CardDescription className="text-xs">
              <T>Active work orders tracked across configurable factory process stages</T>
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="text-xs h-7" asChild>
            <Link href={supplyChainHref("production")}>
              <T>Open Production Floor</T>
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent>
          {pipeline.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <T>No process stages configured yet.</T>{" "}
              <Link href={supplyChainHref("settings")} className="text-amber-600 underline font-medium">
                <T>Configure processes in Settings</T>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {pipeline.map((stage, idx) => (
                <Link
                  key={stage.id}
                  href={supplyChainHref("production", { dept: stage.department })}
                  className="rounded-xl border p-3 bg-muted/20 hover:bg-muted/50 hover:border-amber-400/60 transition-all text-center group"
                >
                  <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                    <T>Step</T> {idx + 1}
                  </div>
                  <div className="text-xs font-semibold text-foreground truncate group-hover:text-amber-600 transition-colors">
                    {stage.name}
                  </div>
                  <div className="mt-2 text-xl font-bold font-mono text-foreground">
                    {stage.runCount}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {stage.runCount === 1 ? <T>active run</T> : <T>active runs</T>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traceable Physical Metal Position Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" />
              <T>Physical Metal Ledger Position</T>
            </h3>
            <p className="text-xs text-muted-foreground">
              <T>Authoritative double-entry balances across physical factory accounts (Decimal precision)</T>
            </p>
          </div>
          <Button variant="outline" size="sm" className="text-xs h-7" asChild>
            <Link href={supplyChainHref("metal")}>
              <T>View Full Metal Ledger</T>
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {accounts.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
              <T>No physical metal accounts found. Initialize Gold 995 cutover opening stock in Metal module.</T>
            </div>
          ) : (
            accounts.slice(0, 8).map((acc) => (
              <MaterialBalanceCard
                key={acc.id}
                materialKey={acc.materialKey}
                bucket={acc.bucket}
                balanceGrams={acc.balanceGrams}
                purity={acc.purity}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
