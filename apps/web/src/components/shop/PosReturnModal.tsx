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
import { invoicesApi, posApi, shopsApi } from "@/lib/api";
import { getPosReturnCompletionMessage } from "@/lib/posMessages";
import { ManagerPinDialog } from "@/components/shop/ManagerPinDialog";
import { useT } from "@/providers/translation-provider";
import { Check, Loader2, RotateCcw, Search, Trash2 } from "lucide-react";
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
      variantId?: string;
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
  const [returnIdempotencyKey, setReturnIdempotencyKey] = useState("");
  const [managerPinOpen, setManagerPinOpen] = useState(false);

  const handleLookup = async () => {
    if (!invoiceLookup.trim()) return;
    setLoadingInvoice(true);
    setInvoice(null);
    setSelectedLines([]);
    setReturnIdempotencyKey("");
    try {
      // Find invoice by number or ID
      const res = await invoicesApi.getAll({ search: invoiceLookup.trim(), limit: 5 });
      const items = res.data?.items || res.data || [];
      const lookup = invoiceLookup.trim().toLowerCase();
      const found = items.find(
        (i: any) =>
          (typeof i.invoiceNumber === "string" && i.invoiceNumber.toLowerCase() === lookup) ||
          i.id === invoiceLookup.trim(),
      );

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
      const priorReturns = Array.isArray(invoiceData.returns) ? invoiceData.returns : [];
      const previouslyReturnedQty = (inventoryItemId: string, variantId?: string) =>
        priorReturns.reduce((total: number, posReturn: any) =>
          total + (Array.isArray(posReturn.lines) ? posReturn.lines : []).reduce(
            (lineTotal: number, returnedLine: any) =>
              lineTotal + (
                returnedLine.inventoryItemId === inventoryItemId &&
                ((returnedLine.variantId || variantId)
                  ? returnedLine.variantId === variantId
                  : true)
                  ? Number(returnedLine.qty) || 0
                  : 0
              ),
            0,
          ),
        0,
      );
      const candidates = rawLines
        .filter((l: any) => l.inventoryItemId)
        .map((l: any) => {
          const maxQty = Math.max(
            0,
            (Number(l.quantity) || 1) - previouslyReturnedQty(l.inventoryItemId, l.variantId),
          );
          return {
            inventoryItemId: l.inventoryItemId,
            variantId: l.variantId || undefined,
            label: l.label || "Jewellery piece",
            qty: 1,
            maxQty,
            unitPrice: l.unitPrice || l.amount || 0,
            reason: "Customer return / exchange",
            disposition: "RESTOCK" as const,
          };
        })
        .filter((line: { maxQty: number }) => line.maxQty > 0);
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

  const submitReturn = async (managerPin?: string) => {
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
      const idempotencyKey = returnIdempotencyKey || crypto.randomUUID();
      setReturnIdempotencyKey(idempotencyKey);
      const res = await posApi.processReturn({
        invoiceNumber: invoice.invoiceNumber,
        lines: selectedLines.map((l) => ({
          inventoryItemId: l.inventoryItemId,
          variantId: l.variantId,
          qty: l.qty,
          reason: l.reason,
          disposition: l.disposition,
        })),
        refundMethod,
        idempotencyKey,
        managerPin,
        notes: notes.trim() || undefined,
      });

      const completion = getPosReturnCompletionMessage(
        res.data?.refundStatus,
        Number(res.data?.refundAmount || 0),
        currencySymbol,
      );
      toast({
        title: t(completion.title),
        description: t(completion.description),
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

  const handleProcessReturn = async () => {
    if (selectedLines.length === 0) {
      toast({
        variant: "destructive",
        title: t("No items selected"),
        description: t("Please select at least one item to return."),
      });
      return;
    }
    try {
      const statusResponse = await shopsApi.getManagerPinStatus();
      const status = statusResponse.data?.data ?? statusResponse.data;
      if (status?.hasPin) {
        setManagerPinOpen(true);
        return;
      }
      await submitReturn();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("Return authorization failed"),
        description: err?.response?.data?.message || t("Unable to authorize the return"),
      });
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
              placeholder={t("e.g. INV-20260824-0001 or scan QR")}
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
                  <span><T>Customer:</T> {invoice.customerName || <T>Walk-in</T>}</span>
                  <span><T>Total:</T> {currencySymbol} {invoice.totalAmount}</span>
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
                      <span className="flex items-center gap-2">
                        <span className="font-bold">{currencySymbol} {line.unitPrice * line.qty}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setSelectedLines((lines) => lines.filter((_, lineIndex) => lineIndex !== idx))}
                          title={t("Remove return line")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground"><T>Quantity</T></Label>
                        <Input
                          className="h-8 text-xs"
                          type="number"
                          min={1}
                          max={line.maxQty}
                          value={line.qty}
                          onChange={(event) => {
                            const requested = Number.parseInt(event.target.value, 10);
                            const qty = Number.isFinite(requested)
                              ? Math.min(line.maxQty, Math.max(1, requested))
                              : 1;
                            setSelectedLines((lines) =>
                              lines.map((current, lineIndex) =>
                                lineIndex === idx ? { ...current, qty } : current,
                              ),
                            );
                          }}
                        />
                        <p className="text-[10px] text-muted-foreground"><T>Up to</T> {line.maxQty}</p>
                      </div>
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
                            <SelectItem value="RESTOCK"><T>Restock into Inventory</T></SelectItem>
                            <SelectItem value="QUARANTINE"><T>Quarantine for Inspection</T></SelectItem>
                            <SelectItem value="REPAIR"><T>Send to Karigar Repair</T></SelectItem>
                            <SelectItem value="SCRAP"><T>Scrap / Melt Value</T></SelectItem>
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
                      <SelectItem value="CASH"><T>Cash Refund</T></SelectItem>
                      <SelectItem value="CARD"><T>Card Reversal</T></SelectItem>
                      <SelectItem value="UPI"><T>UPI / Digital Wallet</T></SelectItem>
                      <SelectItem value="BANK_TRANSFER"><T>Bank Transfer</T></SelectItem>
                      <SelectItem value="STORE_CREDIT"><T>Store Credit</T></SelectItem>
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
      <ManagerPinDialog
        open={managerPinOpen}
        onOpenChange={setManagerPinOpen}
        title={t("Authorize return")}
        description="A manager PIN is required before this return can be processed."
        onVerified={async (managerPin) => {
          setManagerPinOpen(false);
          await submitReturn(managerPin);
        }}
      />
    </Dialog>
  );
}
