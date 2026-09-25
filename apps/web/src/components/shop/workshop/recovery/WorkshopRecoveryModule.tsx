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
  type WorkshopRecoveryContainer,
  type WorkshopRecoveryEvent,
  type WorkshopProcessDefinition,
  type WorkshopWorkstation,
} from "@/lib/workshop-api";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Flame,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Scale,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { ScaleCapturePanel } from "../shared/ScaleCapturePanel";

export function WorkshopRecoveryModule({ canApprove = true }: { canApprove?: boolean }) {
  const t = useT();
  const [bags, setBags] = useState<WorkshopRecoveryContainer[]>([]);
  const [definitions, setDefinitions] = useState<WorkshopProcessDefinition[]>([]);
  const [workstations, setWorkstations] = useState<WorkshopWorkstation[]>([]);
  const [selectedBagId, setSelectedBagId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Create Bag Modal
  const [showCreateBagModal, setShowCreateBagModal] = useState(false);
  const [bagCode, setBagCode] = useState("");
  const [materialKey, setMaterialKey] = useState("goldGrains995");
  const [workstationId, setWorkstationId] = useState("");
  const [submittingBag, setSubmittingBag] = useState(false);

  // Send Event Modal
  const [closingBagId, setClosingBagId] = useState<string | null>(null);
  const [sendLoading, setSendLoading] = useState(false);

  // Reconcile Event Modal
  const [activeEvent, setActiveEvent] = useState<WorkshopRecoveryEvent | null>(null);
  const [varianceReason, setVarianceReason] = useState("");
  const [reconcilingLoading, setReconcilingLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bagsRes, catRes] = await Promise.allSettled([
        workshopApi.recoveryBags(),
        workshopApi.catalog(),
      ]);

      if (bagsRes.status === "fulfilled") setBags(bagsRes.value.data || []);
      if (catRes.status === "fulfilled") {
        setDefinitions(catRes.value.data?.definitions || []);
        setWorkstations(catRes.value.data?.workstations || []);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateBag = async () => {
    if (!bagCode.trim()) return;
    setSubmittingBag(true);
    try {
      await workshopApi.createRecoveryBag({
        code: bagCode.trim(),
        materialKey,
        workstationId: workstationId || undefined,
      });
      setShowCreateBagModal(false);
      setBagCode("");
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to create bag");
    } finally {
      setSubmittingBag(false);
    }
  };

  const handleCloseAndSend = async (containerId: string) => {
    setSendLoading(true);
    try {
      await workshopApi.createRecoveryEvent(containerId);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to create recovery event");
    } finally {
      setSendLoading(false);
    }
  };

  const handleInspectEvent = async (eventId: string) => {
    try {
      const res = await workshopApi.recoveryEvent(eventId);
      setActiveEvent(res.data);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to load event");
    }
  };

  const handleReconcileAndClose = async () => {
    if (!activeEvent || !varianceReason.trim()) return;
    setReconcilingLoading(true);
    try {
      await workshopApi.classifyRecovery(activeEvent.id, varianceReason.trim());
      setActiveEvent(null);
      setVarianceReason("");
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Reconciliation failed");
    } finally {
      setReconcilingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-border">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 flex items-center justify-center shrink-0">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  <T>Recovery, Scrap & Refinery Management</T>
                </h2>
                <Badge variant="outline" className="text-xs font-mono">
                  {bags.length} <T>Bags</T>
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                <T>
                  Collect filing, cutting, and polishing residue into tracked bags; dispatch to refinery, record assay, and reconcile fine gold.
                </T>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
              onClick={() => setShowCreateBagModal(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              <T>Open New Recovery Bag</T>
            </Button>
            <Button variant="outline" size="sm" onClick={loadData} className="text-xs h-8">
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              <T>Refresh</T>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recovery Bags Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <T>Tracked Recovery Bags</T>
        </h3>

        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            <T>Loading recovery bags…</T>
          </div>
        ) : bags.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
            <T>No recovery bags created yet. Open a bag when collecting cutting or polishing residue.</T>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bags.map((bag) => {
              const isOpen = bag.status === "OPEN";
              const isClosed = bag.status === "CLOSED";
              const isProcessed = bag.status === "PROCESSED";
              const daysOld = Math.floor(
                (new Date().getTime() - new Date(bag.openedAt).getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <Card key={bag.id} className="border-border hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-foreground">{bag.code}</span>
                      <Badge
                        variant={isOpen ? "secondary" : isProcessed ? "default" : "outline"}
                        className="text-[10px] font-mono capitalize"
                      >
                        {bag.status}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">
                        <T>Expected Weighed Balance</T>
                      </div>
                      <div className="font-mono text-2xl font-bold text-foreground">
                        {parseFloat(bag.expectedBalanceGrams || "0").toFixed(3)}{" "}
                        <span className="text-xs font-normal text-muted-foreground">g</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-muted-foreground pt-2 border-t flex justify-between">
                      <span>{bag.materialKey}</span>
                      <span>{daysOld === 0 ? "Opened today" : `${daysOld} days ago`}</span>
                    </div>

                    {/* Actions */}
                    <div className="pt-1 flex items-center justify-between gap-2">
                      {isOpen && parseFloat(bag.expectedBalanceGrams || "0") > 0 && canApprove && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-7 border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={() => handleCloseAndSend(bag.id)}
                          disabled={sendLoading}
                        >
                          <Flame className="h-3 w-3 mr-1 text-orange-600" />
                          <T>Close & Send to Refinery</T>
                        </Button>
                      )}

                      {bag.events && bag.events.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-xs h-7 text-amber-600 hover:text-amber-700"
                          onClick={() => handleInspectEvent(bag.events[0].id)}
                        >
                          <History className="h-3 w-3 mr-1" />
                          <span><T>Inspect Event</T> #{bag.events[0].id.slice(0, 6)}</span>
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

      {/* Inspect Recovery Event Dialog */}
      {activeEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-600" />
                  <T>Refinery Recovery Settlement</T>
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Event #{activeEvent.id.slice(0, 8)} · Bag: {activeEvent.container?.code}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActiveEvent(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 font-mono rounded-lg border bg-muted/20 p-3">
                <div>
                  <span className="text-muted-foreground block text-[11px]"><T>Physical Sent Weight</T></span>
                  <span className="font-bold text-foreground">{parseFloat(activeEvent.sendGrams || "0").toFixed(3)} g</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]"><T>Status</T></span>
                  <span className="font-bold text-foreground capitalize">{activeEvent.status}</span>
                </div>
              </div>

              {activeEvent.assays && activeEvent.assays.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    <T>Assay Results</T>
                  </span>
                  {activeEvent.assays.map((a) => (
                    <div key={a.id} className="rounded border p-2 flex justify-between font-mono">
                      <span>Source: {a.source}</span>
                      <span className="font-bold text-amber-600">Purity: {parseFloat(a.fineGoldFraction).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeEvent.status === "SENT" && canApprove && (
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs"><T>Final Settlement Variance Reason</T></Label>
                  <Input
                    placeholder={t("Verified assay fine gold yield and recovery loss")}
                    value={varianceReason}
                    onChange={(e) => setVarianceReason(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 mt-2"
                    onClick={handleReconcileAndClose}
                    disabled={reconcilingLoading || !varianceReason.trim()}
                  >
                    {reconcilingLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                    <T>Classify Variance & Settle Recovery</T>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Recovery Bag Modal */}
      {showCreateBagModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-foreground"><T>Open Tracked Recovery Bag</T></h3>
            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs mb-1 block"><T>Bag Code / Identifier</T></Label>
                <Input
                  placeholder="e.g. RB-POL-0019"
                  value={bagCode}
                  onChange={(e) => setBagCode(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block"><T>Material Kind</T></Label>
                <select
                  value={materialKey}
                  onChange={(e) => setMaterialKey(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2 font-mono"
                >
                  <option value="goldGrains995">Gold Grains 995</option>
                  <option value="masterAlloy">Master Alloy</option>
                </select>
              </div>

              <div>
                <Label className="text-xs mb-1 block"><T>Associated Workstation (Optional)</T></Label>
                <select
                  value={workstationId}
                  onChange={(e) => setWorkstationId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2"
                >
                  <option value="">None / General</option>
                  {workstations.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCreateBagModal(false)}>
                <T>Cancel</T>
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleCreateBag}
                disabled={submittingBag || !bagCode.trim()}
              >
                {submittingBag ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <T>Open Bag</T>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
