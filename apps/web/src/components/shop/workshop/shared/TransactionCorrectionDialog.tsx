"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { useT } from "@/providers/translation-provider";
import { workshopApi, type WorkshopJournalEntry } from "@/lib/workshop-api";
import { workshopRetryKey, type WorkshopRetryKey } from "@/lib/workshop-retry-key";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Loader2,
  RotateCcw,
  ShieldAlert,
  X,
} from "lucide-react";

export interface TransactionCorrectionDialogProps {
  journal: WorkshopJournalEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reversalResult: any) => void;
}

export function TransactionCorrectionDialog({
  journal,
  isOpen,
  onClose,
  onSuccess,
}: TransactionCorrectionDialogProps) {
  const t = useT();
  const [correctionMode, setCorrectionMode] = useState<"VOID" | "REPLACE">("REPLACE");
  const [replacementWeight, setReplacementWeight] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const retry = useRef<WorkshopRetryKey | null>(null);

  useEffect(() => {
    retry.current = null;
    setCorrectionMode("REPLACE");
    setReplacementWeight("");
    setReason("");
    setLoading(false);
    setErrorMessage(null);
  }, [journal?.id]);

  if (!isOpen || !journal) return null;

  const isReversed = !!(journal.reversedById || journal.reversedBy);
  const isReplacement = !!journal.replacementForId;

  // Determine workflow-specific dependency warnings
  const getWorkflowContext = () => {
    switch (journal.referenceType) {
      case "TRANSFER_DISPATCH":
        return {
          title: "Transfer Dispatch Correction",
          warning:
            "Reversing this dispatch will restore the transfer to PREPARED status if not yet received downstream. It will be blocked if the receiving department already weighed the receipt.",
        };
      case "TRANSFER_RECEIPT":
        return {
          title: "Transfer Receipt Correction",
          warning:
            "Reversing this receipt will recalculate the transfer difference and restore destination WIP. It will be blocked if downstream processes have already consumed this received metal.",
        };
      case "RECOVERY_DEPOSIT":
        return {
          title: "Recovery Deposit Correction",
          warning:
            "Reversing this deposit will restore the source WIP and deduct from the recovery bag. It will be blocked if the bag has already been closed or sent to the refinery.",
        };
      case "RECOVERY_SEND":
        return {
          title: "Recovery Send Correction",
          warning:
            "Reversing this send will reopen the recovery bag. It will be blocked if refinery recovery results or assays have already been processed.",
        };
      case "RECOVERY_RESULT":
        return {
          title: "Recovery Result Correction",
          warning:
            "Reversing this result will revert the recovery event to SENT status and withdraw the recovered fine gold from the vault/destination.",
        };
      case "FINISHED_RECEIPT":
        return {
          title: "Finished Goods Receipt Correction / Void",
          warning:
            "Reversing this finished receipt will void the resulting InventoryItem (marking it DISCONTINUED) and return the jewellery job to 'In Progress' for re-weighing. It will be BLOCKED if the item has already been commercially sold, reserved, or invoiced.",
        };
      case "STONE_SETTING":
      case "STONE_RETURN":
        return {
          title: "Stone Movement Correction",
          warning:
            "Reversing this stone movement updates tree stone counts. It will be blocked if a final finished receipt has already consumed the stones.",
        };
      default: {
        const isAdditional =
          (journal.metadata as any)?.movementKind === "ADDITIONAL_ISSUE" ||
          (journal.referenceType === "MATERIAL_ISSUE" && !!journal.processRunId);
        if (isAdditional) {
          return {
            title: "Additional Issue (Solder/Alloy) Correction",
            warning:
              "Reversing this additional issue will return the material to the original source account and remove it from the active process run. It will be BLOCKED if downstream process outputs have already consumed the material.",
          };
        }
        return {
          title: "Standard Physical Movement Correction",
          warning:
            "An audited reversal entry will negate the original movement. If replacement weight is provided, a replacement journal will immediately post.",
        };
      }
    }
  };

  const context = getWorkflowContext();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setErrorMessage(t("A detailed audit reason is strictly required for physical transaction corrections"));
      return;
    }
    if (correctionMode === "REPLACE" && (!replacementWeight || parseFloat(replacementWeight) <= 0)) {
      setErrorMessage(t("Enter a valid positive replacement weight in grams"));
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await workshopApi.correctJournal(journal.id, {
        reason: reason.trim(),
        replacementWeightGrams: correctionMode === "REPLACE" ? replacementWeight : undefined,
        idempotencyKey: (retry.current = workshopRetryKey(retry.current,
          { journalId: journal.id, reason: reason.trim(), correctionMode, replacementWeight },
          () => crypto.randomUUID())).key,
      });
      retry.current = null;
      onSuccess(res.data);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || t("Correction failed. Check dependency requirements.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                <T>Correct Physical Transaction</T>
              </h3>
              <p className="text-[11px] text-muted-foreground font-mono">
                #{journal.entryNumber} · {t(journal.referenceType)} · {journal.id.slice(0, 8)}…
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Status Check */}
          {isReversed && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span><T>This transaction has already been reversed and cannot be corrected again.</T></span>
            </div>
          )}

          {/* Original Transaction Summary */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <T>Original Physical Journal Record</T>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono">
              <div>
                <span className="text-muted-foreground"><T>Reference Type</T>:</span>{" "}
                <span className="font-semibold text-foreground">{t(journal.referenceType)}</span>
              </div>
              <div>
                <span className="text-muted-foreground"><T>Material</T>:</span>{" "}
                <span className="font-semibold text-foreground">{journal.materialKey}</span>
              </div>
              <div>
                <span className="text-muted-foreground"><T>Physical Weight</T>:</span>{" "}
                <span className="font-bold text-foreground">{parseFloat(journal.weightGrams).toFixed(3)} g</span>
              </div>
              <div>
                <span className="text-muted-foreground"><T>Posted At</T>:</span>{" "}
                <span className="text-foreground">{new Date(journal.postedAt).toLocaleString()}</span>
              </div>
            </div>
            {journal.description && (
              <div className="text-[11px] text-muted-foreground pt-1 border-t">
                <T>{journal.description}</T>
              </div>
            )}
          </div>

          {/* Workflow Domain Dependency Warning */}
          <div className="rounded-lg border border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <T>{context.title}</T>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              <T>{context.warning}</T>
            </p>
          </div>

          {/* Correction Mode Choice */}
          {!isReversed && (
            <div className="space-y-3 pt-1">
              <Label className="text-xs font-semibold"><T>Correction Action</T></Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={correctionMode === "REPLACE" ? "default" : "outline"}
                  className="text-xs h-9 justify-start"
                  onClick={() => setCorrectionMode("REPLACE")}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  <T>Reversal + Replacement</T>
                </Button>
                <Button
                  type="button"
                  variant={correctionMode === "VOID" ? "destructive" : "outline"}
                  className="text-xs h-9 justify-start"
                  onClick={() => setCorrectionMode("VOID")}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  <T>Void / Complete Reversal</T>
                </Button>
              </div>

              {correctionMode === "REPLACE" && (
                <div>
                  <Label className="text-xs text-foreground"><T>Corrected Replacement Weight (g)</T></Label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={replacementWeight}
                    onChange={(e) => setReplacementWeight(e.target.value)}
                    className="mt-1 font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    <T>Original weight was</T> {parseFloat(journal.weightGrams).toFixed(3)}g
                  </p>
                </div>
              )}

              <div>
                <Label className="text-xs text-foreground">
                  <T>Mandatory Audit Reason</T> <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder={t("e.g. Scale reading recalibration, misclassified stone tare, wrong drawer selected")}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              {errorMessage && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{t(errorMessage)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            <T>Cancel</T>
          </Button>
          {!isReversed && (
            <Button
              size="sm"
              variant={correctionMode === "VOID" ? "destructive" : "default"}
              onClick={handleSubmit}
              disabled={loading || !reason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {correctionMode === "VOID" ? <T>Confirm Void / Reversal</T> : <T>Post Corrected Replacement</T>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
