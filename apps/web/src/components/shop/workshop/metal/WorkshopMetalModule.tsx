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
  type WorkshopAccount,
  type WorkshopCutoverStatus,
  type WorkshopReportsResponse,
  type WorkshopJournalEntry,
} from "@/lib/workshop-api";
import {
  AlertTriangle,
  ArrowRight,
  Coins,
  Cpu,
  History,
  Layers,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { MaterialBalanceCard } from "../shared/MaterialBalanceCard";
import { TransactionCorrectionDialog } from "../shared/TransactionCorrectionDialog";
import { WorkshopDomainTooltip } from "../shared/WorkshopDomainTooltip";

export function WorkshopMetalModule({ canApprove = true }: { canApprove?: boolean }) {
  const t = useT();
  const [accounts, setAccounts] = useState<WorkshopAccount[]>([]);
  const [cutover, setCutover] = useState<WorkshopCutoverStatus | null>(null);
  const [reports, setReports] = useState<WorkshopReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Opening Balance Dialog
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [openingWeight, setOpeningWeight] = useState("");
  const [openingSource, setOpeningSource] = useState("");
  const [openingReason, setOpeningReason] = useState("");
  const [openingSubmitting, setOpeningSubmitting] = useState(false);

  // Correction Dialog
  const [selectedJournal, setSelectedJournal] = useState<WorkshopJournalEntry | null>(null);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, cutRes, repRes] = await Promise.allSettled([
        workshopApi.accounts(),
        workshopApi.cutoverStatus(),
        workshopApi.reports(),
      ]);

      if (accRes.status === "fulfilled") setAccounts(accRes.value.data || []);
      if (cutRes.status === "fulfilled") setCutover(cutRes.value.data || null);
      if (repRes.status === "fulfilled") setReports(repRes.value.data || null);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePostOpening = async () => {
    if (!openingWeight || parseFloat(openingWeight) <= 0) return;
    setOpeningSubmitting(true);
    try {
      await workshopApi.postManualOpening({
        weightGrams: openingWeight,
        source: openingSource.trim() || "Audited physical vault weighing",
        reason: openingReason.trim() || "Cutover to TRACEABLE physical metal ledger",
      });
      setShowOpeningModal(false);
      setOpeningWeight("");
      setOpeningSource("");
      setOpeningReason("");
      loadData();
    } catch (err: any) {
      alert(t(err?.response?.data?.message || err?.message || "Failed to post opening balance"));
    } finally {
      setOpeningSubmitting(false);
    }
  };

  const transactions = reports?.correctionHistory || [];

  return (
    <div className="space-y-6">
      {/* 1. Header & Cutover Status Card */}
      <Card className="border-amber-200 dark:border-amber-950/60 bg-gradient-to-br from-amber-50/20 via-card to-card">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <T>Physical Gold 995 & Metal Ledger</T>
                  <WorkshopDomainTooltip term="gold995" />
                </h2>
                <Badge
                  variant={cutover?.workshopLedgerVersion === "TRACEABLE" ? "default" : "outline"}
                  className="text-xs font-mono"
                >
                  {cutover?.workshopLedgerVersion || "TRACEABLE"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                <T>
                  Authoritative physical double-entry gram accounts. Isolated from legacy estimate floats.
                </T>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {canApprove && (
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                onClick={() => setShowOpeningModal(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <T>Initialize Opening Stock</T>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={loadData} className="text-xs h-8">
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              <T>Refresh</T>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Metal Account Balances Grid */}
      <div className="space-y-3" data-tour="workshop-metal-balances">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-500" />
            <span><T>Active Metal Accounts</T> ({accounts.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="flex min-h-[160px] items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            <T>Loading metal accounts…</T>
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
            <T>No accounts active yet. Post opening balance to initialize vault.</T>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {accounts.map((acc) => (
              <MaterialBalanceCard
                key={acc.id}
                materialKey={acc.materialKey}
                bucket={acc.bucket}
                balanceGrams={acc.balanceGrams}
                purity={acc.purity}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3. Physical Transactions & Corrections Audit Table */}
      <Card className="border-border" data-tour="workshop-metal-journal">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-amber-500" />
              <T>Traceable Transactions & Corrections Audit</T>
              <WorkshopDomainTooltip term="correctionReversal" />
            </CardTitle>
            <CardDescription className="text-xs">
              <T>Immutable physical journal records with reversal and replacement lineage</T>
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0" data-tour="workshop-metal-corrections">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              <T>No special override or correction transactions posted yet.</T>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase font-medium border-b text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4"><T>Entry #</T></th>
                    <th className="py-3 px-3"><T>Type</T></th>
                    <th className="py-3 px-3"><T>Material</T></th>
                    <th className="py-3 px-3"><T>Physical Weight</T></th>
                    <th className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <T>Scale / Source</T>
                        <WorkshopDomainTooltip term="manualOverride" />
                      </div>
                    </th>
                    <th className="py-3 px-3"><T>Posted At</T></th>
                    <th className="py-3 px-4 text-right"><T>Action</T></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {transactions.map((entry) => {
                    const isReversed = !!entry.reversedBy;

                    return (
                      <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">
                          #{entry.entryNumber}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <Badge
                            variant={isReversed ? "destructive" : "outline"}
                            className="text-[10px] font-mono"
                          >
                            {t(entry.referenceType)}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-foreground">{entry.materialKey}</td>
                        <td className="py-3 px-3 font-bold text-foreground">
                          {parseFloat(entry.weightGrams).toFixed(3)} g
                        </td>
                        <td className="py-3 px-3 font-sans text-muted-foreground">
                          {entry.scaleReading ? <T>Scale Reading</T> : <T>Manual Override</T>}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {new Date(entry.postedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canApprove && !isReversed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-rose-600 hover:text-rose-700"
                              onClick={() => {
                                setSelectedJournal(entry);
                                setShowCorrectionDialog(true);
                              }}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              <T>Correct</T>
                            </Button>
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

      {/* Opening Balance Modal */}
      {showOpeningModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-background border rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-600" />
              <h3 className="text-sm font-bold text-foreground">
                <T>Initialize Physical Gold 995 Opening Stock</T>
              </h3>
            </div>

            <div className="rounded-lg border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-200">
              <T>
                IMPORTANT: Physical Gold 995 is NOT automatically equivalent to legacy 24K/999 estimate floats. Weigh your physical grains or bars to record verified opening grams.
              </T>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <Label className="text-xs mb-1 block"><T>Physical Gold 995 Weight (Grams)</T></Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={openingWeight}
                  onChange={(e) => setOpeningWeight(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block"><T>Verification Source</T></Label>
                <Input
                  placeholder={t("e.g. Physical safe count audited by owner")}
                  value={openingSource}
                  onChange={(e) => setOpeningSource(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs mb-1 block"><T>Audit Reason / Notes</T></Label>
                <Input
                  placeholder={t("Cutover to traceable factory manufacturing")}
                  value={openingReason}
                  onChange={(e) => setOpeningReason(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowOpeningModal(false)}>
                <T>Cancel</T>
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handlePostOpening}
                disabled={openingSubmitting || !openingWeight || parseFloat(openingWeight) <= 0}
              >
                {openingSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <T>Post Opening Balance</T>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Correction Dialog */}
      <TransactionCorrectionDialog
        journal={selectedJournal}
        isOpen={showCorrectionDialog}
        onClose={() => {
          setShowCorrectionDialog(false);
          setSelectedJournal(null);
        }}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
