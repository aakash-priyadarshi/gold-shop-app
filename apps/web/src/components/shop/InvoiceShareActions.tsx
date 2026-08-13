"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { useFeatures } from "@/hooks/useFeatures";
import { invoicesApi } from "@/lib/api";
import {
  buildBillShareText,
  shareBillOnWhatsApp,
  type BillShareInput,
} from "@/lib/billShare";
import {
  buildInvoicePdfFile,
  downloadBlob,
  fetchInvoicePdfBlob,
  prefetchInvoicePdf,
  sharePdfWithFallbacks,
} from "@/lib/invoicePdf";
import {
  loadHardwareConfig,
  printReceipt,
  type ReceiptPayload,
} from "@/lib/posHardware";
import { useT } from "@/providers/translation-provider";
import {
  Bluetooth,
  Download,
  FileText,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export interface InvoiceShareActionsProps {
  invoice: BillShareInput & {
    id: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    verificationToken?: string | null;
  };
  /** ESC/POS payload for Bluetooth thermal print */
  receiptPayload?: ReceiptPayload | null;
  size?: "sm" | "default";
  className?: string;
}

export function InvoiceShareActions({
  invoice,
  receiptPayload,
  size = "sm",
  className = "",
}: InvoiceShareActionsProps) {
  const t = useT();
  const { hasFeature, planName, loading: featuresLoading } = useFeatures();
  const [emailOpen, setEmailOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [emailTo, setEmailTo] = useState(invoice.customerEmail || "");
  const [smsTo, setSmsTo] = useState(invoice.customerPhone || "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [btPrinting, setBtPrinting] = useState(false);

  // PDF + OS share is free for all shops. SMS remains plan-gated.
  const canSms = hasFeature("invoiceShareSms");
  const canBluetooth = hasFeature("bluetoothThermalPrinter");

  useEffect(() => {
    if (!invoice.id) return;
    prefetchInvoicePdf(invoice.id);
  }, [invoice.id]);

  const shareInput: BillShareInput = {
    ...invoice,
    publicUrl: invoice.verificationToken
      ? `${typeof window !== "undefined" ? window.location.origin : "https://www.orivraa.com"}/verify-bill/${invoice.verificationToken}`
      : invoice.publicUrl,
  };

  const loadPdf = async () => {
    const { blob, filename } = await fetchInvoicePdfBlob(invoice.id);
    const file = buildInvoicePdfFile(blob, filename);
    return { blob, filename, file, text: buildBillShareText(shareInput) };
  };

  /** Primary path: text + PDF via OS share sheet (WhatsApp, Gmail, etc.). */
  const shareWithPdf = async (preferWhatsAppHint = false) => {
    setPdfBusy(true);
    try {
      const { blob, filename, file, text } = await loadPdf();
      const title = `Invoice ${invoice.invoiceNumber || ""}`;

      const result = await sharePdfWithFallbacks({ file, text, title });
      if (result === "shared" || result === "cancelled") return;

      downloadBlob(blob, filename);
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* ignore */
      }

      if (preferWhatsAppHint) {
        shareBillOnWhatsApp(shareInput, invoice.customerPhone);
        toast({
          title: t("PDF saved"),
          description: t(
            "PDF downloaded. WhatsApp is opening with the bill text — attach the PDF in the chat.",
          ),
        });
        return;
      }

      toast({
        title: t("PDF ready"),
        description: t(
          "PDF downloaded. Bill text copied — attach the PDF in any app.",
        ),
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("Could not generate PDF"),
        description: err?.message || t("Try again in a moment"),
      });
      if (preferWhatsAppHint) {
        shareBillOnWhatsApp(shareInput, invoice.customerPhone);
      }
    } finally {
      setPdfBusy(false);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfBusy(true);
    try {
      const { blob, filename } = await fetchInvoicePdfBlob(invoice.id);
      downloadBlob(blob, filename);
      toast({ title: t("PDF downloaded") });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("Could not generate PDF"),
        description: err?.message || t("Try again in a moment"),
      });
    } finally {
      setPdfBusy(false);
    }
  };

  const handleEmail = async () => {
    setSending(true);
    try {
      await invoicesApi.shareEmail(invoice.id, {
        to: emailTo || undefined,
        message: message || undefined,
      });
      toast({
        title: t("Email sent"),
        description: t("PDF invoice attached"),
      });
      setEmailOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("Email failed"),
        description:
          err?.response?.data?.message ||
          t("Could not send email. Check recipient address."),
      });
    } finally {
      setSending(false);
    }
  };

  const handleSms = async () => {
    setSending(true);
    try {
      await invoicesApi.shareSms(invoice.id, {
        to: smsTo || undefined,
        message: message || undefined,
      });
      toast({ title: t("SMS sent") });
      setSmsOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("SMS failed"),
        description:
          err?.response?.data?.message ||
          t("Could not send SMS. Available on Pro+ / Enterprise when enabled."),
      });
    } finally {
      setSending(false);
    }
  };

  const handleBluetooth = async () => {
    if (!canBluetooth) {
      toast({
        variant: "destructive",
        title: t("Upgrade required"),
        description: t(
          `Bluetooth printing is not enabled on ${planName || "your plan"}.`,
        ),
      });
      return;
    }
    const cfg = loadHardwareConfig();
    if (!cfg.printer.enabled || cfg.printer.transport !== "bluetooth") {
      toast({
        title: t("Pair a Bluetooth printer"),
        description: t(
          "Open Hardware settings, select Bluetooth, and pair your SEZNIK printer.",
        ),
      });
      return;
    }
    if (!receiptPayload) {
      toast({
        variant: "destructive",
        title: t("Nothing to print"),
      });
      return;
    }
    setBtPrinting(true);
    try {
      await printReceipt(receiptPayload);
      toast({ title: t("Sent to Bluetooth printer") });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: t("Bluetooth print failed"),
        description:
          e?.message ||
          t("Pair the printer in Settings → Hardware and try again."),
      });
    } finally {
      setBtPrinting(false);
    }
  };

  const btn = size === "sm" ? "sm" : "default";

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <Button
          variant="default"
          size={btn}
          onClick={() => void shareWithPdf(false)}
          disabled={pdfBusy}
          data-tour="invoice-share-pdf"
        >
          {pdfBusy ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4 mr-2" />
          )}
          <T>Share PDF</T>
        </Button>
        <Button
          variant="outline"
          size={btn}
          onClick={() => void shareWithPdf(true)}
          disabled={pdfBusy}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          <T>WhatsApp</T>
        </Button>
        <Button
          variant="outline"
          size={btn}
          onClick={() => void handleDownloadPdf()}
          disabled={pdfBusy}
        >
          <Download className="h-4 w-4 mr-2" />
          <T>Download PDF</T>
        </Button>
        <Button
          variant="outline"
          size={btn}
          onClick={() => {
            setEmailTo(invoice.customerEmail || "");
            setMessage("");
            setEmailOpen(true);
          }}
        >
          <Mail className="h-4 w-4 mr-2" />
          <T>Email</T>
        </Button>
        <Button
          variant="outline"
          size={btn}
          onClick={() => {
            if (!canSms) {
              toast({
                variant: "destructive",
                title: t("Upgrade required"),
                description: t(
                  `SMS delivery is not enabled on ${planName || "your plan"} (Pro+ / Enterprise).`,
                ),
              });
              return;
            }
            setSmsTo(invoice.customerPhone || "");
            setMessage("");
            setSmsOpen(true);
          }}
        >
          {!canSms && !featuresLoading ? (
            <Lock className="h-4 w-4 mr-2" />
          ) : (
            <MessageSquare className="h-4 w-4 mr-2" />
          )}
          <T>SMS</T>
        </Button>
        <Button
          variant="outline"
          size={btn}
          onClick={handleBluetooth}
          disabled={btPrinting}
        >
          {btPrinting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Bluetooth className="h-4 w-4 mr-2" />
          )}
          <T>Bluetooth</T>
        </Button>
        {canBluetooth && (
          <Button variant="ghost" size={btn} asChild>
            <Link href="/m/settings/hardware">
              <T>Hardware</T>
            </Link>
          </Button>
        )}
      </div>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <T>Email invoice</T>
            </DialogTitle>
            <DialogDescription>
              <T>Sends the bill summary and a PDF attachment.</T>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>
                <T>To</T>
              </Label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="customer@email.com"
              />
            </div>
            <div>
              <Label>
                <T>Message (optional)</T>
              </Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder={t("Leave blank to send the default bill summary")}
              />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <T>PDF will be generated on send and attached automatically.</T>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>
              <T>Cancel</T>
            </Button>
            <Button onClick={handleEmail} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              <T>Send email</T>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={smsOpen} onOpenChange={setSmsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <T>SMS invoice</T>
            </DialogTitle>
            <DialogDescription>
              <T>Send a short bill summary by SMS (Pro+ / Enterprise).</T>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>
                <T>Phone</T>
              </Label>
              <Input
                value={smsTo}
                onChange={(e) => setSmsTo(e.target.value)}
                placeholder="+91…"
              />
            </div>
            <div>
              <Label>
                <T>Message (optional)</T>
              </Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={480}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSmsOpen(false)}>
              <T>Cancel</T>
            </Button>
            <Button onClick={handleSms} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              <T>Send SMS</T>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
