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
  loadHardwareConfig,
  printReceipt,
  type ReceiptPayload,
} from "@/lib/posHardware";
import { useT } from "@/providers/translation-provider";
import {
  Bluetooth,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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
  const [btPrinting, setBtPrinting] = useState(false);

  const canWhatsApp =
    featuresLoading || hasFeature("invoiceShareWhatsApp") || hasFeature("mobileWhatsAppShare");
  const canEmail = hasFeature("invoiceShareEmail");
  const canSms = hasFeature("invoiceShareSms");
  const canBluetooth = hasFeature("bluetoothThermalPrinter");

  const shareInput: BillShareInput = {
    ...invoice,
    publicUrl: invoice.verificationToken
      ? `${typeof window !== "undefined" ? window.location.origin : "https://www.orivraa.com"}/verify-bill/${invoice.verificationToken}`
      : invoice.publicUrl,
  };

  const handleWhatsApp = () => {
    if (!canWhatsApp) {
      toast({
        variant: "destructive",
        title: t("Upgrade required"),
        description: t(
          `WhatsApp bill share is not enabled on ${planName || "your plan"}.`,
        ),
      });
      return;
    }
    shareBillOnWhatsApp(shareInput, invoice.customerPhone);
  };

  const handleNativeShare = async () => {
    const text = buildBillShareText(shareInput);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoice.invoiceNumber || ""}`,
          text,
        });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: t("Copied"), description: t("Bill text copied to clipboard") });
    } catch {
      toast({
        variant: "destructive",
        title: t("Could not share"),
        description: t("Copy to clipboard failed"),
      });
    }
  };

  const handleEmail = async () => {
    setSending(true);
    try {
      await invoicesApi.shareEmail(invoice.id, {
        to: emailTo || undefined,
        message: message || undefined,
      });
      toast({ title: t("Email sent") });
      setEmailOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: t("Email failed"),
        description:
          err?.response?.data?.message ||
          t("Could not send email. Check plan features and recipient."),
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
    if (
      !cfg.printer.enabled ||
      cfg.printer.transport !== "bluetooth"
    ) {
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
        <Button variant="outline" size={btn} onClick={handleWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-2" />
          <T>WhatsApp</T>
        </Button>
        <Button variant="outline" size={btn} onClick={handleNativeShare}>
          <Share2 className="h-4 w-4 mr-2" />
          <T>Share</T>
        </Button>
        <Button
          variant="outline"
          size={btn}
          onClick={() => {
            if (!canEmail) {
              toast({
                variant: "destructive",
                title: t("Upgrade required"),
                description: t(
                  `Email delivery is not enabled on ${planName || "your plan"}.`,
                ),
              });
              return;
            }
            setEmailTo(invoice.customerEmail || "");
            setMessage("");
            setEmailOpen(true);
          }}
        >
          {!canEmail && !featuresLoading ? (
            <Lock className="h-4 w-4 mr-2" />
          ) : (
            <Mail className="h-4 w-4 mr-2" />
          )}
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
              <T>Send this bill to the customer by email.</T>
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
