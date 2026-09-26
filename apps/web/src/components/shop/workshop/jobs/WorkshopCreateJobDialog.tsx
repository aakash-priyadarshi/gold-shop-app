"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { karigarApi } from "@/lib/api";
import { supplyChainHref } from "@/lib/workshop-route";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Hammer,
  Loader2,
  Plus,
  UserPlus,
} from "lucide-react";

export interface WorkshopCreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobCreated?: (job: any) => void;
  defaultMetalKey?: string;
}

interface KarigarWorkshop {
  id: string;
  name: string;
  artisan: string;
}

export function WorkshopCreateJobDialog({
  open,
  onOpenChange,
  onJobCreated,
  defaultMetalKey = "goldGrains995",
}: WorkshopCreateJobDialogProps) {
  const t = useT();
  const [workshops, setWorkshops] = useState<KarigarWorkshop[]>([]);
  const [loadingWorkshops, setLoadingWorkshops] = useState(false);

  // Job form fields
  const [product, setProduct] = useState("");
  const [workshopId, setWorkshopId] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [metalKey, setMetalKey] = useState(defaultMetalKey);
  const [qty, setQty] = useState("1");
  const [priority, setPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdJob, setCreatedJob] = useState<any | null>(null);

  // Inline Quick Add Karigar state
  const [isAddingKarigar, setIsAddingKarigar] = useState(false);
  const [newArtisanName, setNewArtisanName] = useState("");
  const [newWorkshopName, setNewWorkshopName] = useState("");
  const [savingKarigar, setSavingKarigar] = useState(false);
  const [karigarError, setKarigarError] = useState<string | null>(null);

  const loadWorkshops = useCallback(async () => {
    setLoadingWorkshops(true);
    try {
      const res = await karigarApi.getSnapshot();
      const wsList: KarigarWorkshop[] = (res.data?.workshops || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        artisan: w.artisan || w.name,
      }));
      setWorkshops(wsList);
      if (wsList.length > 0 && !workshopId) {
        setWorkshopId(wsList[0].id);
      }
    } catch {
      // handled
    } finally {
      setLoadingWorkshops(false);
    }
  }, [workshopId]);

  useEffect(() => {
    if (open) {
      loadWorkshops();
      setError(null);
      setCreatedJob(null);
      setIsAddingKarigar(false);
    }
  }, [open, loadWorkshops]);

  const handleQuickAddKarigar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtisanName.trim() || !newWorkshopName.trim()) {
      setKarigarError(t("Please fill in both artisan and workshop names."));
      return;
    }
    setSavingKarigar(true);
    setKarigarError(null);
    try {
      const snapRes = await karigarApi.getSnapshot();
      const existing = snapRes.data?.workshops || [];
      const vaultReserves = snapRes.data?.vaultReserves || {};
      const customMaterials = snapRes.data?.customMaterials;
      const newWs = {
        id: `ws-${Date.now()}`,
        name: newWorkshopName.trim(),
        artisan: newArtisanName.trim(),
        location: "Local",
        rating: 5.0,
        metalIssued: 0,
        metalReturned: 0,
        wastagePercent: 0,
        wastageLimit: 1.0,
        wageRatePerGram: 200,
        outstandingBalance: 0,
        wageDue: 0,
      };
      const updated = [...existing, newWs];
      await karigarApi.saveSnapshot({
        vaultReserves,
        workshops: updated,
        customMaterials,
      });

      setWorkshops((prev) => [
        ...prev,
        { id: newWs.id, name: newWs.name, artisan: newWs.artisan },
      ]);
      setWorkshopId(newWs.id);
      setIsAddingKarigar(false);
      setNewArtisanName("");
      setNewWorkshopName("");
    } catch (err: any) {
      setKarigarError(err?.response?.data?.message || err?.message || t("Could not save karigar."));
    } finally {
      setSavingKarigar(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.trim()) {
      setError(t("Please enter a product or design name."));
      return;
    }
    if (!workshopId) {
      setError(t("Please select a karigar or workshop."));
      return;
    }

    const selectedWs = workshops.find((w) => w.id === workshopId);
    if (!selectedWs) {
      setError(t("Selected karigar not found."));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const parsedQty = parseInt(qty, 10);
      const parsedWeight = parseFloat(grossWeight);

      const res = await karigarApi.createJob({
        product: product.trim(),
        artisan: selectedWs.artisan,
        workshopId: selectedWs.id,
        grossWeight: isNaN(parsedWeight) ? 0 : parsedWeight,
        metalKey: metalKey || "goldGrains995",
        qty: isNaN(parsedQty) || parsedQty < 1 ? 1 : parsedQty,
        priority,
        dueAt: dueAt || undefined,
        notes: notes.trim() || undefined,
      });

      const newJob = res.data;
      setCreatedJob(newJob);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("workshop-jobs-updated", { detail: newJob }));
      }
      onJobCreated?.(newJob);

      // Auto-close after brief confirmation
      setTimeout(() => {
        onOpenChange(false);
        // Reset form
        setProduct("");
        setGrossWeight("");
        setQty("1");
        setNotes("");
        setDueAt("");
      }, 900);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t("Failed to create manufacturing job."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-amber-500" />
            <T>Create Manufacturing Job</T>
          </DialogTitle>
          <DialogDescription>
            <T>
              Start a traceable work order for workshop fabrication, casting, and multi-stage processing.
            </T>
          </DialogDescription>
        </DialogHeader>

        {createdJob ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto animate-bounce" />
            <p className="text-sm font-semibold text-foreground">
              <T>Work order created successfully!</T>
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              #{createdJob.id} · {createdJob.product}
            </p>
          </div>
        ) : (
          <form onSubmit={handleCreateJob} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Karigar Check / Warning */}
            {loadingWorkshops ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                <T>Loading artisans…</T>
              </div>
            ) : workshops.length === 0 ? (
              <div className="rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      <T>You need a Karigar/workshop before creating a manufacturing job.</T>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      <T>
                        Manufacturing jobs assign metal custody to a workshop or artisan ledger.
                      </T>
                    </p>
                  </div>
                </div>

                {!isAddingKarigar ? (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                      onClick={() => setIsAddingKarigar(true)}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      <T>Add Karigar</T>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8"
                      asChild
                    >
                      <Link href={supplyChainHref("book")}>
                        <T>Open Karigar Book</T>
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-background p-3 space-y-3">
                    <div className="text-xs font-semibold text-foreground">
                      <T>Quick Add Karigar</T>
                    </div>
                    {karigarError && (
                      <p className="text-[11px] text-destructive">{karigarError}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px]"><T>Artisan Name</T></Label>
                        <Input
                          value={newArtisanName}
                          onChange={(e) => setNewArtisanName(e.target.value)}
                          placeholder={t("e.g. Ramesh Soni")}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]"><T>Workshop Name</T></Label>
                        <Input
                          value={newWorkshopName}
                          onChange={(e) => setNewWorkshopName(e.target.value)}
                          placeholder={t("e.g. Ramesh Workshop")}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setIsAddingKarigar(false)}
                      >
                        <T>Cancel</T>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingKarigar}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7"
                        onClick={handleQuickAddKarigar}
                      >
                        {savingKarigar && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        <T>Save Karigar & Continue</T>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="workshop-karigar-select" className="text-xs font-medium">
                    <T>Karigar / Workshop</T> <span className="text-destructive">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsAddingKarigar((v) => !v)}
                    className="text-[11px] text-amber-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <T>New Karigar</T>
                  </button>
                </div>

                {isAddingKarigar && (
                  <div className="rounded-lg border bg-muted/30 p-2.5 space-y-2 mb-2">
                    {karigarError && <p className="text-[11px] text-destructive">{karigarError}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={newArtisanName}
                        onChange={(e) => setNewArtisanName(e.target.value)}
                        placeholder={t("Artisan name")}
                        className="h-8 text-xs bg-background"
                      />
                      <Input
                        value={newWorkshopName}
                        onChange={(e) => setNewWorkshopName(e.target.value)}
                        placeholder={t("Workshop name")}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6"
                        onClick={() => setIsAddingKarigar(false)}
                      >
                        <T>Cancel</T>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingKarigar}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-6"
                        onClick={handleQuickAddKarigar}
                      >
                        {savingKarigar && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        <T>Save</T>
                      </Button>
                    </div>
                  </div>
                )}

                <select
                  id="workshop-karigar-select"
                  value={workshopId}
                  onChange={(e) => setWorkshopId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{t("Select Karigar / Workshop…")}</option>
                  {workshops.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.artisan} ({w.name})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Product / Design Name */}
            <div className="space-y-1">
              <Label htmlFor="workshop-job-product" className="text-xs font-medium">
                <T>Product / Design Name</T> <span className="text-destructive">*</span>
              </Label>
              <Input
                id="workshop-job-product"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder={t("e.g. 22K Traditional Bridal Choker")}
                className="text-xs h-9"
              />
            </div>

            {/* Quantity & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="workshop-job-qty" className="text-xs font-medium">
                  <T>Quantity (Pieces)</T>
                </Label>
                <Input
                  id="workshop-job-qty"
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="workshop-job-priority" className="text-xs font-medium">
                  <T>Priority</T>
                </Label>
                <select
                  id="workshop-job-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs h-9 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="LOW">{t("Low")}</option>
                  <option value="NORMAL">{t("Normal")}</option>
                  <option value="HIGH">{t("High")}</option>
                  <option value="URGENT">{t("Urgent")}</option>
                </select>
              </div>
            </div>

            {/* Target Purity/Material & Target Weight */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="workshop-job-metal" className="text-xs font-medium">
                  <T>Target Material</T>
                </Label>
                <select
                  id="workshop-job-metal"
                  value={metalKey}
                  onChange={(e) => setMetalKey(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs h-9 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="goldGrains995">{t("Gold 995 Grains (0.995)")}</option>
                  <option value="goldGrains24k">{t("Gold Grains 24K")}</option>
                  <option value="goldBars24k">{t("Gold Cast Bars 24K")}</option>
                  <option value="silverBullion999">{t("Silver Bullion (999)")}</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="workshop-job-weight" className="text-xs font-medium">
                  <T>Target Weight (Grams)</T>
                </Label>
                <Input
                  id="workshop-job-weight"
                  type="number"
                  step="0.001"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(e.target.value)}
                  placeholder={t("Optional, e.g. 45.50")}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <Label htmlFor="workshop-job-due" className="text-xs font-medium">
                <T>Due Date</T>
              </Label>
              <Input
                id="workshop-job-due"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label htmlFor="workshop-job-notes" className="text-xs font-medium">
                <T>Manufacturing Notes</T>
              </Label>
              <Input
                id="workshop-job-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("e.g. Custom client engraving, filigree finishing")}
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                <T>Cancel</T>
              </Button>
              <Button
                type="submit"
                disabled={submitting || workshops.length === 0}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                <T>Create Work Order</T>
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
