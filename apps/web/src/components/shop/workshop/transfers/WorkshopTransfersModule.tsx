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
  type WorkshopTransfer,
  type WorkshopJob,
  type WorkshopProcessDefinition,
  type WorkshopMaterial,
} from "@/lib/workshop-api";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Scale,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { ScaleCapturePanel } from "../shared/ScaleCapturePanel";
import { WorkshopDomainTooltip } from "../shared/WorkshopDomainTooltip";

export function WorkshopTransfersModule({ canApprove = true }: { canApprove?: boolean }) {
  const t = useT();
  const [transfers, setTransfers] = useState<WorkshopTransfer[]>([]);
  const [jobs, setJobs] = useState<WorkshopJob[]>([]);
  const [definitions, setDefinitions] = useState<WorkshopProcessDefinition[]>([]);
  const [materials, setMaterials] = useState<WorkshopMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // Prepare Transfer Modal
  const [showPrepareModal, setShowPrepareModal] = useState(false);
  const [selectedTreeId, setSelectedTreeId] = useState("");
  const [materialKey, setMaterialKey] = useState("goldGrains995");
  const [fromDept, setFromDept] = useState("Casting");
  const [toDept, setToDept] = useState("Filing");
  const [submittingPrepare, setSubmittingPrepare] = useState(false);

  // Active Weighed Action on a Transfer
  const [activeTransferForWeighing, setActiveTransferForWeighing] = useState<WorkshopTransfer | null>(null);
  const [weighingAction, setWeighingAction] = useState<"TRANSFER_DISPATCH" | "TRANSFER_RECEIPT">("TRANSFER_DISPATCH");

  // Exception approval modal
  const [approvingTransfer, setApprovingTransfer] = useState<WorkshopTransfer | null>(null);
  const [approvalReason, setApprovalReason] = useState("");
  const [approvingLoading, setApprovingLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [trRes, jobsRes, catRes] = await Promise.allSettled([
        workshopApi.transfers(),
        workshopApi.jobs(),
        workshopApi.catalog(),
      ]);

      if (trRes.status === "fulfilled") setTransfers(trRes.value.data || []);
      if (jobsRes.status === "fulfilled") {
        const jList = jobsRes.value.data || [];
        setJobs(jList);
        const firstTree = jList.find((j) => j.trees?.length)?.trees?.[0];
        if (firstTree && !selectedTreeId) setSelectedTreeId(firstTree.id);
      }
      if (catRes.status === "fulfilled") {
        setDefinitions(catRes.value.data?.processes || []);
        const activeMats = catRes.value.data?.materials.filter((m) => m.isActive) || [];
        setMaterials(activeMats);
        if (activeMats.length > 0 && !activeMats.some((m) => m.key === materialKey)) {
          setMaterialKey(activeMats[0].key);
        }
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [selectedTreeId, materialKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (materials.length > 0 && !materials.some((m) => m.key === materialKey)) {
      setMaterialKey(materials[0].key);
    }
  }, [materials, materialKey]);

  const handlePrepareTransfer = async () => {
    if (!selectedTreeId || !fromDept || !toDept || materials.length === 0 || !materials.some((m) => m.key === materialKey)) return;
    setSubmittingPrepare(true);
    try {
      await workshopApi.prepareTransfer({
        treeId: selectedTreeId,
        materialKey,
        fromDepartment: fromDept,
        toDepartment: toDept,
      });
      setShowPrepareModal(false);
      loadData();
    } catch (err: any) {
      alert(t(err?.response?.data?.message || err?.message || "Failed to prepare transfer"));
    } finally {
      setSubmittingPrepare(false);
    }
  };

  const handleApproveException = async () => {
    if (!approvingTransfer || !approvalReason.trim()) return;
    setApprovingLoading(true);
    try {
      await workshopApi.approveTransfer(approvingTransfer.id, approvalReason.trim());
      setApprovingTransfer(null);
      setApprovalReason("");
      loadData();
    } catch (err: any) {
      alert(t(err?.response?.data?.message || err?.message || "Approval failed"));
    } finally {
      setApprovingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <Card className="border-border">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/50 text-cyan-600 flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  <T>Department Material Transfers</T>
                </h2>
                <Badge variant="outline" className="text-xs font-mono">
                  {transfers.length} <T>Transfers</T>
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                <T>
                  Track inter-department dispatch, transit custody, receiving verification, and tolerance reconciliation.
                </T>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
              onClick={() => setShowPrepareModal(true)}
              data-tour="workshop-transfer-create"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              <T>New Transfer</T>
            </Button>
            <Button variant="outline" size="sm" onClick={loadData} className="text-xs h-8">
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              <T>Refresh</T>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Active Weighing Modal / Flyout if Weighing is Triggered */}
      {activeTransferForWeighing && (
        <Card className="border-2 border-cyan-400 bg-cyan-50/20 dark:bg-cyan-950/20 shadow-lg">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Scale className="h-4 w-4 text-cyan-600" />
                <span>
                  {weighingAction === "TRANSFER_DISPATCH" ? (
                    <span><T>Weigh Dispatch:</T> {activeTransferForWeighing.fromDepartment} → {activeTransferForWeighing.toDepartment}</span>
                  ) : (
                    <span><T>Weigh Receipt at</T> {activeTransferForWeighing.toDepartment}</span>
                  )}
                </span>
              </CardTitle>
              <CardDescription className="text-xs font-mono">
                <T>Transfer #</T>{activeTransferForWeighing.id.slice(0, 8)} · <T>Material:</T> {activeTransferForWeighing.materialKey}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setActiveTransferForWeighing(null)}
              aria-label={t("Close")}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            <ScaleCapturePanel
              key={`${activeTransferForWeighing.id}:${weighingAction}`}
              purpose={materials.find((m) => m.key === activeTransferForWeighing.materialKey)?.scalePurpose || "GOLD"}
              materialKey={activeTransferForWeighing.materialKey}
              treeId={activeTransferForWeighing.treeId}
              movementKind={weighingAction}
              transferId={activeTransferForWeighing.id}
              canApprove={canApprove}
              onRequiresApproval={loadData}
              onConfirmed={() => {
                setActiveTransferForWeighing(null);
                loadData();
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* 3. Transfers Queue Table */}
      <Card className="border-border" data-tour="workshop-transfer-list">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              <T>Loading department transfers…</T>
            </div>
          ) : transfers.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-3">
              <p><T>No material transfers recorded yet. Move physical material between departments with dispatch and receipt weighing.</T></p>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                onClick={() => setShowPrepareModal(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <T>New Transfer</T>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase font-medium border-b text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4"><T>Transfer #</T></th>
                    <th className="py-3 px-3"><T>Route</T></th>
                    <th className="py-3 px-3"><T>Material</T></th>
                    <th className="py-3 px-3"><T>Dispatch Weight</T></th>
                    <th className="py-3 px-3"><T>Receive Weight</T></th>
                    <th className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <T>Difference / Tol</T>
                        <WorkshopDomainTooltip term="transferVariance" />
                      </div>
                    </th>
                    <th className="py-3 px-3"><T>Status</T></th>
                    <th className="py-3 px-4 text-right"><T>Workflow Action</T></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {transfers.map((tr) => {
                    const isPrepared = tr.status === "PREPARED";
                    const isDispatched = tr.status === "DISPATCHED";
                    const isException = tr.status === "EXCEPTION";
                    const isReconciled = tr.status === "RECONCILED";

                    return (
                      <tr key={tr.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">
                          #{tr.id.slice(0, 8)}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span className="font-semibold text-foreground">{tr.fromDepartment}</span>
                          <span className="text-muted-foreground mx-1.5">→</span>
                          <span className="font-semibold text-foreground">{tr.toDepartment}</span>
                        </td>
                        <td className="py-3 px-3 text-foreground">{tr.materialKey}</td>
                        <td className="py-3 px-3">
                          {tr.dispatchReading ? (
                            <span className="text-foreground font-semibold">
                              {parseFloat(String(tr.dispatchReading.weightGrams)).toFixed(3)} g
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic"><T>Pending weigh-out</T></span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {tr.receiveReading ? (
                            <span className="text-foreground font-semibold">
                              {parseFloat(String(tr.receiveReading.weightGrams)).toFixed(3)} g
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic"><T>Pending weigh-in</T></span>
                          )}
                        </td>
                        <td className="py-3 px-3" data-tour="workshop-transfer-variance">
                          {tr.differenceGrams ? (
                            <span
                              className={`font-bold ${
                                isException ? "text-rose-600" : "text-foreground"
                              }`}
                            >
                              {parseFloat(tr.differenceGrams).toFixed(3)} g
                              {tr.toleranceRule && (
                                <span className="text-[10px] text-muted-foreground font-normal ml-1">
                                  (<T>max</T> {parseFloat(String(tr.toleranceRule.maxDifferenceGrams)).toFixed(3)}g)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              isReconciled
                                ? "default"
                                : isException
                                ? "destructive"
                                : isDispatched
                                ? "secondary"
                                : "outline"
                            }
                            className="text-[10px] font-mono capitalize"
                          >
                            <T>{tr.status}</T>
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isPrepared && (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-sans"
                              onClick={() => {
                                setActiveTransferForWeighing(tr);
                                setWeighingAction("TRANSFER_DISPATCH");
                              }}
                              data-tour="workshop-transfer-dispatch"
                            >
                              <Scale className="h-3.5 w-3.5 mr-1" />
                              <T>Weigh Dispatch</T>
                            </Button>
                          )}
                          {(isDispatched || (isException && !!tr.approvedAt)) && (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700 text-white font-sans"
                              onClick={() => {
                                setActiveTransferForWeighing(tr);
                                setWeighingAction("TRANSFER_RECEIPT");
                              }}
                              data-tour="workshop-transfer-receive"
                            >
                              <Scale className="h-3.5 w-3.5 mr-1" />
                              <T>Weigh Receipt</T>
                            </Button>
                          )}
                          {isException && !tr.approvedAt && canApprove && (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white font-sans"
                              onClick={() => {
                                setApprovingTransfer(tr);
                                setApprovalReason("");
                              }}
                            >
                              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                              <T>Approve Exception</T>
                            </Button>
                          )}
                          {isReconciled && (
                            <span className="text-emerald-600 text-[11px] font-sans flex items-center justify-end gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <T>Settled</T>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prepare Transfer Modal */}
      {showPrepareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Truck className="h-4 w-4 text-cyan-600" />
              <T>Prepare Department Transfer</T>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs mb-1 block"><T>Select Casting Tree / Work Order</T></Label>
                <select
                  value={selectedTreeId}
                  onChange={(e) => setSelectedTreeId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2 font-mono"
                >
                  {jobs.flatMap((j) =>
                    (j.trees || []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {j.product} · {/* i18n-user-content: operator-entered casting tree label */ t.label} (#{t.id.slice(0, 6)})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <Label className="text-xs mb-1 block"><T>Material</T></Label>
                {materials.length === 0 ? (
                  <p className="text-xs text-amber-600 py-1"><T>No active materials available for transfer</T></p>
                ) : (
                  <select
                    value={materialKey}
                    onChange={(e) => setMaterialKey(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2 font-mono"
                  >
                    {materials.map((material) => <option key={material.id} value={material.key}>{material.name}</option>)}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs mb-1 block"><T>From Department</T></Label>
                  <Input
                    value={fromDept}
                    onChange={(e) => setFromDept(e.target.value)}
                  placeholder={t("e.g. Casting")}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block"><T>To Department</T></Label>
                  <Input
                    value={toDept}
                    onChange={(e) => setToDept(e.target.value)}
                    placeholder={t("e.g. Filing / Setting")}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowPrepareModal(false)}>
                <T>Cancel</T>
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handlePrepareTransfer}
                disabled={submittingPrepare || !selectedTreeId || materials.length === 0}
              >
                {submittingPrepare ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <T>Prepare Transfer</T>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Exception Approval Modal */}
      {approvingTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-rose-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <T>Approve Out-Of-Tolerance Transfer Variance</T>
            </h3>

            <div className="rounded-lg border border-rose-300 bg-rose-50/50 dark:bg-rose-950/20 p-3 text-xs text-rose-900 dark:text-rose-200">
              <p>
                <T>Transfer difference</T>:{" "}
                <span className="font-mono font-bold">
                  {parseFloat(approvingTransfer.differenceGrams || "0").toFixed(3)}g
                </span>{" "}
                (<T>Max allowed:</T> {parseFloat(String(approvingTransfer.toleranceRule?.maxDifferenceGrams || 0)).toFixed(3)}g)
              </p>
              {approvingTransfer.exceptionReason && (
                <p className="mt-1 italic"><T>Note:</T> {approvingTransfer.exceptionReason}</p>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <Label className="text-xs"><T>Supervisor Audit Reason</T></Label>
              <Input
                placeholder={t("Verified physical spill/loss in transit audited by supervisor")}
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setApprovingTransfer(null)}>
                <T>Cancel</T>
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleApproveException}
                disabled={approvingLoading || !approvalReason.trim()}
              >
                {approvingLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <T>Approve Exception</T>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
