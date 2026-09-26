"use client";

import { useState, useEffect } from "react";
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
} from "@/lib/workshop-api";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Coins,
  Cpu,
  Eye,
  Loader2,
  Package,
  Scale,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { ScaleCapturePanel } from "../shared/ScaleCapturePanel";

export interface WorkshopFinishedReceiptDialogProps {
  job: WorkshopJob | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (inventoryItemId: string) => void;
  canApprove?: boolean;
}

export function WorkshopFinishedReceiptDialog({
  job,
  isOpen,
  onClose,
  onSuccess,
  canApprove = true,
}: WorkshopFinishedReceiptDialogProps) {
  const t = useT();
  const [readingId, setReadingId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [grossWeight, setGrossWeight] = useState<string>("0.00");
  const [productName, setProductName] = useState("");
  const [jewelleryType, setJewelleryType] = useState("RING");
  const [submitting, setSubmitting] = useState(false);
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setReadingId(null);
    setSessionId(null);
    setGrossWeight("0.00");
    setJewelleryType("RING");
    setErrorMessage(null);
    setProductName(job?.product || "");
    setCreatedItemId(job?.inventoryItemId || null);
  }, [job?.id, job?.product, job?.inventoryItemId, isOpen]);

  if (!isOpen || !job) return null;

  const primaryTree = job.trees?.[0];

  const numGross = parseFloat(grossWeight || "0");

  const handleConfirmFinishedReceipt = async () => {
    if (!readingId || !sessionId) {
      setErrorMessage(t("Please capture an authoritative Gold Scale reading first"));
      return;
    }
    if (!primaryTree) {
      setErrorMessage(t("Job has no casting tree"));
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const confirmRes = await workshopApi.confirm(sessionId, {
        readingId,
        finishedGoods: { nameEn: productName.trim() || job.product, jewelleryType },
      });
      if ("requiresApproval" in confirmRes.data) throw new Error(t("Finished receipt unexpectedly requires transfer approval"));

      const newItemId = confirmRes.data.inventoryItem?.id;
      if (newItemId) {
        setCreatedItemId(newItemId);
        onSuccess(newItemId);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || t("Finished receipt confirmation failed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                <T>Finished Goods Scale Receipt</T>
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                {job.product} · <T>Job #</T>{job.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {createdItemId ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-emerald-950 dark:text-emerald-100">
                <T>Finished Jewellery Received & Inventory Stock Created!</T>
              </h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                <T>
                  The jewellery piece has been successfully weighed, recorded in the traceable metal journal, and created as an active catalog inventory item.
                </T>
              </p>
              <div className="pt-2">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                  <Link href={`/dashboard/shop/inventory?id=${createdItemId}`}>
                    <Eye className="h-4 w-4 mr-1.5" />
                    <T>View Inventory Item</T>
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Scale Capture Section */}
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  <T>1. Authoritative Gold Scale Weigh-In (Gross Jewellery)</T>
                </Label>
                <ScaleCapturePanel
                  key={job.id}
                  purpose="GOLD"
                  materialKey={job.metalKey || "goldGrains995"}
                  treeId={primaryTree?.id || ""}
                  movementKind="FINISHED_RECEIPT"
                  canApprove={canApprove}
                  externalConfirm
                  onCaptured={(capturedSessionId, readId, grams) => {
                    setSessionId(capturedSessionId);
                    setReadingId(readId);
                    setGrossWeight(grams || "0.00");
                  }}
                />
              </div>

              {/* Set Stone Deduction & Metal Net Weight Formula */}
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  <T>2. Weight Calculation Formula</T>
                </Label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground"><T>Gross Scale Weight (g)</T></Label>
                    <div className="font-mono text-base font-bold text-foreground mt-0.5">
                      {numGross.toFixed(3)} g
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground"><T>Set Stone Weight (g)</T></Label>
                    <div className="text-xs text-muted-foreground mt-1"><T>From confirmed stone movements</T></div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground"><T>Stone weight is derived from confirmed stone movements; it cannot be entered at receipt.</T></p>

                <div className="pt-2 border-t flex justify-between items-center font-mono">
                  <span className="font-semibold text-foreground"><T>Calculated Metal Weight</T>:</span>
                  <span className="text-xs text-muted-foreground"><T>Calculated securely at confirmation</T></span>
                </div>
              </div>

              {/* Inventory Item Fields */}
              <div className="space-y-3 pt-1">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  <T>3. Resulting Catalog Item Details</T>
                </Label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs"><T>Catalog Product Name</T></Label>
                    <Input
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs"><T>Jewellery Category</T></Label>
                    <select
                      value={jewelleryType}
                      onChange={(e) => setJewelleryType(e.target.value)}
                      className="w-full rounded-md border border-input bg-background p-2 text-xs mt-1"
                    >
                      <option value="RING"><T>Ring</T></option>
                      <option value="NECKLACE"><T>Necklace</T></option>
                      <option value="EARRINGS"><T>Earrings</T></option>
                      <option value="BRACELET"><T>Bracelet</T></option>
                      <option value="BANGLES"><T>Bangles</T></option>
                      <option value="PENDANT"><T>Pendant</T></option>
                      <option value="CHAIN"><T>Chain</T></option>
                      <option value="OTHER"><T>Other Jewellery</T></option>
                    </select>
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            <T>Close</T>
          </Button>
          {!createdItemId && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleConfirmFinishedReceipt}
              disabled={submitting || !readingId || numGross <= 0}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Package className="h-3.5 w-3.5 mr-1.5" />}
              <T>Confirm Receipt & Create Stock</T>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
