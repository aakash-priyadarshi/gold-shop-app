"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { T } from "@/components/ui/T";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { posApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import { CheckCircle2, DollarSign, FileText, Loader2, Printer } from "lucide-react";
import { useState } from "react";

interface PosShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "OPEN" | "CLOSE" | "Z_REPORT";
  registerId: string;
  registerName: string;
  currentShift?: any;
  currencySymbol?: string;
  onShiftUpdated: () => void;
}

export function PosShiftModal({
  open,
  onOpenChange,
  mode,
  registerId,
  registerName,
  currentShift,
  currencySymbol = "NPR",
  onShiftUpdated,
}: PosShiftModalProps) {
  const t = useT();
  const [openingCash, setOpeningCash] = useState("0");
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [zReportData, setZReportData] = useState<any>(null);

  const handleOpenShift = async () => {
    setLoading(true);
    try {
      await posApi.openShift({
        registerId,
        openingCash: parseFloat(openingCash) || 0,
        notes: notes.trim() || undefined,
      });
      toast({
        title: t("Shift opened successfully"),
        description: `${registerName} is ready for counter sales.`,
      });
      onShiftUpdated();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("Could not open shift"),
        description: err?.response?.data?.message || t("Unknown error"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!currentShift?.id) return;
    const counted = parseFloat(closingCash);
    if (!Number.isFinite(counted) || counted < 0) {
      toast({
        variant: "destructive",
        title: t("Invalid counted cash"),
        description: t("Please enter the physical cash counted in the drawer."),
      });
      return;
    }

    setLoading(true);
    try {
      const res = await posApi.closeShift(currentShift.id, {
        closingCash: counted,
        notes: notes.trim() || undefined,
      });
      toast({
        title: t("Shift closed successfully"),
        description: t("Z-Report generated and drawer reconciled."),
      });
      setZReportData(res.data);
      onShiftUpdated();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("Could not close shift"),
        description: err?.response?.data?.message || t("Unknown error"),
      });
    } finally {
      setLoading(false);
    }
  };

  const printZReport = () => {
    const printWindow = window.open("", "_blank", "width=480,height=700");
    if (!printWindow) return;
    const summary = zReportData?.summary || currentShift?.summary || currentShift?.liveSummary;
    const shift = zReportData || currentShift;
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Z-Report - ${registerName}</title>
  <style>
    body { font-family: monospace; font-size: 12px; padding: 16px; max-width: 320px; margin: 0 auto; }
    h2 { text-align: center; margin: 4px 0; font-size: 16px; }
    p { margin: 3px 0; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; margin: 4px 0; }
    .bold { font-weight: bold; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h2>Z-REPORT (DAILY SHIFT CLOSE)</h2>
  <p style="text-align:center">${registerName}</p>
  <div class="divider"></div>
  <p><strong>Shift ID:</strong> ${shift?.id?.slice(0, 8)}...</p>
  <p><strong>Opened:</strong> ${new Date(shift?.openedAt).toLocaleString()}</p>
  <p><strong>Closed:</strong> ${shift?.closedAt ? new Date(shift.closedAt).toLocaleString() : "ACTIVE"}</p>
  <div class="divider"></div>
  <div class="row"><span>Opening Cash:</span><span>${currencySymbol} ${summary?.openingCash || 0}</span></div>
  <div class="row"><span>Cash Sales:</span><span>${currencySymbol} ${summary?.cashSales || 0}</span></div>
  <div class="row"><span>Card Sales:</span><span>${currencySymbol} ${summary?.cardSales || 0}</span></div>
  <div class="row"><span>UPI / Wallet Sales:</span><span>${currencySymbol} ${summary?.upiWalletSales || 0}</span></div>
  <div class="row"><span>Bank Transfer:</span><span>${currencySymbol} ${summary?.bankTransferSales || 0}</span></div>
  <div class="row"><span>Cash Refunds:</span><span>-${currencySymbol} ${summary?.cashRefunds || 0}</span></div>
  <div class="divider"></div>
  <div class="row bold"><span>Total Revenue:</span><span>${currencySymbol} ${summary?.totalSales || 0}</span></div>
  <div class="row bold"><span>Expected Cash in Drawer:</span><span>${currencySymbol} ${summary?.expectedCash || 0}</span></div>
  ${shift?.closingCash != null ? `<div class="row bold"><span>Counted Closing Cash:</span><span>${currencySymbol} ${shift.closingCash}</span></div>` : ""}
  ${shift?.variance != null ? `<div class="row bold" style="color:${Number(shift.variance) < 0 ? 'red' : 'green'}"><span>Variance (Short/Over):</span><span>${currencySymbol} ${shift.variance}</span></div>` : ""}
  <div class="divider"></div>
  <p style="text-align:center;font-size:10px">End of Z-Report · Orivraa POS</p>
  <script>setTimeout(function(){ window.print(); }, 250);</script>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const summary = currentShift?.liveSummary || currentShift?.summary;
  const countedNum = parseFloat(closingCash) || 0;
  const expectedNum = summary?.expectedCash ?? 0;
  const liveVariance = countedNum - expectedNum;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {mode === "OPEN" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <T>Open Cashier Shift</T>
              </DialogTitle>
              <DialogDescription>
                <T>Open a new cashier shift on</T> <strong>{registerName}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="opening-cash"><T>Opening Cash Drawer Float</T> ({currencySymbol})</Label>
                <Input
                  id="opening-cash"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  <T>Physical change/cash present in drawer at the start of shift.</T>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="shift-notes"><T>Shift Notes (Optional)</T></Label>
                <Textarea
                  id="shift-notes"
                  rows={2}
                  placeholder={t("e.g. Morning counter shift")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <T>Cancel</T>
              </Button>
              <Button onClick={handleOpenShift} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                <T>Open Shift</T>
              </Button>
            </DialogFooter>
          </>
        )}

        {mode === "CLOSE" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                <T>Close Shift &amp; Z-Report Reconciliation</T>
              </DialogTitle>
              <DialogDescription>
                <T>Reconcile cash drawer and close shift on</T> <strong>{registerName}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-xl border bg-muted/40 p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground"><T>Opening Float</T>:</span>
                  <span className="font-medium">{currencySymbol} {summary?.openingCash ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground"><T>Cash Sales</T>:</span>
                  <span className="font-medium text-emerald-600">+{currencySymbol} {summary?.cashSales ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground"><T>Card / Digital</T>:</span>
                  <span className="font-medium">+{currencySymbol} {(summary?.cardSales ?? 0) + (summary?.upiWalletSales ?? 0)}</span>
                </div>
                {summary?.cashRefunds > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground"><T>Cash Refunds</T>:</span>
                    <span className="font-medium text-red-600">-{currencySymbol} {summary?.cashRefunds}</span>
                  </div>
                )}
                <div className="border-t pt-1.5 flex justify-between font-bold">
                  <span><T>Expected Cash in Drawer</T>:</span>
                  <span>{currencySymbol} {expectedNum}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="closing-cash"><T>Counted Cash in Drawer</T> ({currencySymbol})</Label>
                <Input
                  id="closing-cash"
                  type="number"
                  min="0"
                  step="any"
                  placeholder={t("Enter physical cash counted")}
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                />
                {closingCash && (
                  <div className="flex justify-between text-xs pt-1">
                    <span><T>Variance</T>:</span>
                    <span className={`font-bold ${liveVariance === 0 ? "text-emerald-600" : liveVariance < 0 ? "text-red-600" : "text-amber-600"}`}>
                      {liveVariance === 0 ? <T>Exact Match</T> : `${liveVariance > 0 ? "+" : ""}${currencySymbol} ${liveVariance}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="close-notes"><T>Closing Notes / Discrepancy Reason</T></Label>
                <Textarea
                  id="close-notes"
                  rows={2}
                  placeholder={t("Reason for any cash difference or handover note")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <T>Cancel</T>
              </Button>
              <Button onClick={handleCloseShift} disabled={loading || !closingCash} className="bg-amber-600 hover:bg-amber-700">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                <T>Close Shift &amp; Generate Z-Report</T>
              </Button>
            </DialogFooter>
          </>
        )}

        {mode === "Z_REPORT" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <T>Z-Report Snapshot</T>
              </DialogTitle>
              <DialogDescription>
                <T>Authoritative daily shift reconciliation snapshot for</T> <strong>{registerName}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border p-4 space-y-3 font-mono text-xs bg-muted/20">
              <div className="flex justify-between">
                <span><T>TOTAL REVENUE</T>:</span>
                <span className="font-bold">{currencySymbol} {summary?.totalSales ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span><T>CASH COLLECTED</T>:</span>
                <span>{currencySymbol} {summary?.cashSales ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span><T>CARD / WALLET</T>:</span>
                <span>{currencySymbol} {(summary?.cardSales ?? 0) + (summary?.upiWalletSales ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span><T>BANK TRANSFER</T>:</span>
                <span>{currencySymbol} {summary?.bankTransferSales ?? 0}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span><T>EXPECTED DRAWER CASH</T>:</span>
                <span>{currencySymbol} {summary?.expectedCash ?? 0}</span>
              </div>
              {currentShift?.closingCash != null && (
                <div className="flex justify-between font-bold">
                  <span><T>COUNTED CASH</T>:</span>
                  <span>{currencySymbol} {currentShift.closingCash}</span>
                </div>
              )}
              {currentShift?.variance != null && (
                <div className="flex justify-between font-bold">
                  <span><T>VARIANCE</T>:</span>
                  <span>{currencySymbol} {currentShift.variance}</span>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between sm:justify-between">
              <Button variant="outline" onClick={printZReport} className="flex items-center gap-1.5">
                <Printer className="h-4 w-4" /> <T>Print Z-Report</T>
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                <T>Done</T>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
