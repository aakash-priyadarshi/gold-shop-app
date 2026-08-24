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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { T } from "@/components/ui/T";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { invoicesApi, posApi } from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import { Check, CheckCircle2, DollarSign, Loader2, RotateCcw, Search } from "lucide-react";
import { useState } from "react";

interface PosReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currencySymbol?: string;
  onReturnCompleted: (posReturn: any) => void;
}

export function PosReturnModal({
  open,
  onOpenChange,
  currencySymbol = "NPR",
  onReturnCompleted,
}: PosReturnModalProps) {
  const t = useT();
  const [invoiceLookup, setInvoiceLookup] = useState("");
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [selectedLines, setSelectedLines] = useState<
    Array<{
      inventoryItemId: string;
      label: string;
      qty: number;
      maxQty: number;
      unitPrice: number;
      reason: string;
      disposition: "RESTOCK" | "QUARANTINE" | "REPAIR" | "SCRAP";
    }>
  >([]);
  const [refundMethod, setRefundMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLookup = async () => {
    if (!invoiceLookup.trim()) return;
    setLoadingInvoice(true);
    setInvoice(null);
    setSelectedLines([]);
    try {
      // Find invoice by number or ID
      const res = await invoicesApi.getAll({ search: invoiceLookup.trim(), limit: 5 });
      const items = res.data?.items || res.data || [];
      const found = items.find(
        (i: any) =>
          i.invoiceNumber.toLowerCase() === invoiceLookup.trim().toLowerCase() ||
          i.id === invoiceLookup.trim(),
      ) || items[0];

      if (!found) {
        toast({
          variant: "destructive",
          title: t("Invoice not found"),
          description: t("Check the invoice number and try again."),
        });
        return;
      }

      // Fetch full details
      const full = await invoicesApi.getById(found.id);
      const invoiceData = full.data;
      setInvoice(invoiceData);

      // Pre-populate candidate return items
      const rawLines = Array.isArray(invoiceData.lineItems)
        ? invoiceData.lineItems
        : [];
      const candidates = rawLines
        .filter((l: any) => l.inventoryItemId)
        .map((l: any) => ({
          inventoryItemId: l.inventoryItemId,
          label: l.label || "Jewellery piece",
          qty: 1,
          maxQty: l.quantity || 1,
          unitPrice: l.unitPrice || l.amount || 0,
          reason: "Customer return / exchange",
          disposition: "RESTOCK" as const,
        }));
      setSelectedLines(candidates);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("Could not load invoice"),
        description: err?.response?.data?.message || t("Unknown error"),
      });
    } finally {
      setLoadingInvoice(false);
    }
  };

  const totalRefundAmount = selectedLines.reduce(
    (sum, line) => sum + line.unitPrice * line.qty,
    0,
  );

  const handleProcessReturn = async () => {
    if (selectedLines.length === 0) {
      toast({
        variant: "destructive",
        title: t("No items selected"),
        description: t("Please select at least one item to return."),
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await posApi.processReturn({
        invoiceNumber: invoice.invoiceNumber,
        lines: selectedLines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          qty: l.qty,
          reason: l.reason,
          disposition: l.disposition,
        })),
        refundMethod,
        notes: notes.trim() || undefined,
      });

      toast({
        title: t("Return processed successfully"),
        description: `Refund of ${currencySymbol} ${totalRefundAmount} issued via ${refundMethod}.`,
      });
      onReturnCompleted(res.data);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("Return failed"),
        description: err?.response?.data?.message || t("Unknown error"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-600" />
            <T>Process POS Return &amp; Exchange</T>
          </DialogTitle>
          <DialogDescription>
            <T>Lookup original invoice by number, inspect items, and select restock/quarantine disposition.</T>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Lookup Bar */}
          <div className="flex gap-2">
            <Input
              placeholder="e.g. INV-20260824-0001 or scan QR"
              value={invoiceLookup}
              onChange={(e) => setInvoiceLookup(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
            <Button onClick={handleLookup} disabled={loadingInvoice || !invoiceLookup.trim()}>
              {loadingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {/* Invoice Found */}
          {invoice && (
            <div className="space-y-3">
              <div className="rounded-xl border bg-muted/30 p-3 text-xs space-y-1">
                <div className="flex justify-between font-bold">
                  <span>{invoice.invoiceNumber}</span>
                  <span>{new Date(invoice.issuedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Customer: {invoice.customerName || "Walk-in"}</span>
                  <span>Total: {currencySymbol} {invoice.totalAmount}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <T>Items to Return</T>
                </Label>
                {selectedLines.map((line, idx) => (
                  <div key={idx} className="rounded-xl border p-3 space-y-2 bg-card text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{line.label}</span>
                      <span className="font-bold">{currencySymbol} {line.unitPrice * line.qty}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground"><T>Disposition</T></Label>
                        <Select
                          value={line.disposition}
                          onValueChange={(val: any) => {
                            const updated = [...selectedLines];
                            updated[idx].disposition = val;
                            setSelectedLines(updated);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RESTOCK">Restock into Inventory</SelectItem>
                            <SelectItem value="QUARANTINE">Quarantine for Inspection</SelectItem>
                            <SelectItem value="REPAIR">Send to Karigar Repair</SelectItem>
                            <SelectItem value="SCRAP">Scrap / Melt Value</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground"><T>Return Reason</T></Label>
                        <Input
                          className="h-8 text-xs"
                          value={line.reason}
                          onChange={(e) => {
                            const updated = [...selectedLines];
                            updated[idx].reason = e.target.value;
                            setSelectedLines(updated);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Settlement Options */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label htmlFor="refund-method"><T>Refund Settlement Method</T></Label>
                  <Select value={refundMethod} onValueChange={setRefundMethod}>
                    <SelectTrigger id="refund-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash Refund</SelectItem>
                      <SelectItem value="CARD">Card Reversal</SelectItem>
                      <SelectItem value="UPI">UPI / Digital Wallet</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="STORE_CREDIT">Store Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end text-right">
                  <span className="text-xs text-muted-foreground"><T>Total Refund Payable</T></span>
                  <span className="text-lg font-bold text-amber-700">
                    {currencySymbol} {totalRefundAmount}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <T>Cancel</T>
          </Button>
          <Button
            onClick={handleProcessReturn}
            disabled={submitting || !invoice || selectedLines.length === 0}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            <T>Complete Return</T>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
