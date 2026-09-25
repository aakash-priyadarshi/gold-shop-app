"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { AlertCircle, CheckCircle2, Scale } from "lucide-react";

export interface ReconciliationSummaryProps {
  totalInputGrams: string;
  forwardWipGrams?: string;
  reusableGrams?: string;
  scrapGrams?: string;
  recoveryPendingGrams?: string;
  refineryGrams?: string;
  varianceGrams?: string;
  unclassifiedGrams: string;
  reconciliationState: "RECONCILED" | "RECONCILIATION_PENDING";
  materialsBreakdown?: Array<{
    materialKey: string;
    inputGrams: string;
    outputGrams: string;
    unclassifiedGrams: string;
    tolerance?: {
      maxDifferenceGrams: string;
      policy: string;
      isWithinTolerance: boolean;
    } | null;
  }>;
}

export function ReconciliationSummary({
  totalInputGrams,
  forwardWipGrams = "0.000000",
  reusableGrams = "0.000000",
  scrapGrams = "0.000000",
  recoveryPendingGrams = "0.000000",
  refineryGrams = "0.000000",
  varianceGrams = "0.000000",
  unclassifiedGrams,
  reconciliationState,
  materialsBreakdown,
}: ReconciliationSummaryProps) {
  const isReconciled = reconciliationState === "RECONCILED" && parseFloat(unclassifiedGrams || "0") === 0;

  // Calculate total accounted
  const accounted = (
    parseFloat(forwardWipGrams || "0") +
    parseFloat(reusableGrams || "0") +
    parseFloat(scrapGrams || "0") +
    parseFloat(recoveryPendingGrams || "0") +
    parseFloat(refineryGrams || "0") +
    parseFloat(varianceGrams || "0")
  ).toFixed(4);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <CardTitle className="text-sm font-semibold">
            <T>Mass Balance & Reconciliation</T>
          </CardTitle>
        </div>
        <Badge
          variant={isReconciled ? "default" : "destructive"}
          className={`text-xs font-mono flex items-center gap-1 ${
            isReconciled ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
          }`}
        >
          {isReconciled ? (
            <>
              <CheckCircle2 className="h-3 w-3" />
              <T>RECONCILED</T>
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3" />
              <T>ACTION REQUIRED</T>
            </>
          )}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center text-foreground font-semibold pb-1 border-b">
            <span><T>Total Weighed Input</T></span>
            <span>{parseFloat(totalInputGrams || "0").toFixed(4)} g</span>
          </div>

          <div className="space-y-1 text-muted-foreground pt-1">
            <div className="flex justify-between items-center">
              <span><T>Forward WIP</T></span>
              <span>{parseFloat(forwardWipGrams).toFixed(4)} g</span>
            </div>
            <div className="flex justify-between items-center">
              <span><T>Reusable Returns</T></span>
              <span>{parseFloat(reusableGrams).toFixed(4)} g</span>
            </div>
            <div className="flex justify-between items-center">
              <span><T>Scrap Metal</T></span>
              <span>{parseFloat(scrapGrams).toFixed(4)} g</span>
            </div>
            <div className="flex justify-between items-center">
              <span><T>Recovery Bag Pending</T></span>
              <span>{parseFloat(recoveryPendingGrams).toFixed(4)} g</span>
            </div>
            {parseFloat(refineryGrams) > 0 && (
              <div className="flex justify-between items-center">
                <span><T>At Refinery</T></span>
                <span>{parseFloat(refineryGrams).toFixed(4)} g</span>
              </div>
            )}
            {parseFloat(varianceGrams) > 0 && (
              <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                <span><T>Approved Process Variance</T></span>
                <span>{parseFloat(varianceGrams).toFixed(4)} g</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center text-foreground font-medium pt-1.5 border-t">
            <span><T>Total Accounted</T></span>
            <span>{accounted} g</span>
          </div>

          <div
            className={`flex justify-between items-center pt-2 border-t font-bold ${
              parseFloat(unclassifiedGrams || "0") > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            <span><T>Unclassified Difference</T></span>
            <span>{parseFloat(unclassifiedGrams || "0").toFixed(4)} g</span>
          </div>
        </div>

        {/* Detailed Material Breakdown if available */}
        {materialsBreakdown && materialsBreakdown.length > 0 && (
          <div className="pt-2">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              <T>By Material Position</T>
            </div>
            <div className="space-y-1.5">
              {materialsBreakdown.map((m) => (
                <div
                  key={m.materialKey}
                  className="rounded border p-2 text-xs flex items-center justify-between bg-background"
                >
                  <div>
                    <span className="font-semibold text-foreground">
                      {m.materialKey === "goldGrains995" ? <T>Gold 995</T> : m.materialKey}
                    </span>
                    <div className="text-[10px] text-muted-foreground">
                      <T>Input</T>: {parseFloat(m.inputGrams).toFixed(3)}g · <T>Output</T>: {parseFloat(m.outputGrams).toFixed(3)}g
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono font-bold ${
                        parseFloat(m.unclassifiedGrams) > 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {parseFloat(m.unclassifiedGrams).toFixed(3)} g
                    </span>
                    {m.tolerance && (
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Tol: {parseFloat(m.tolerance.maxDifferenceGrams).toFixed(3)}g (
                        {m.tolerance.isWithinTolerance ? "Within" : "Exceeded"})
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
