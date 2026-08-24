"use client";

import { T } from "@/components/ui/T";
import { invoicesApi } from "@/lib/api";
import type { BillSettings } from "@/lib/billPrint";
import {
  resolveBillShopAddress,
  resolveBillShopName,
  resolveBillShopPhone,
} from "@/lib/invoiceBranding";
import { CheckCircle2, FileWarning, Loader2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface VerifyBillResult {
  verified: boolean;
  invoiceNumber: string;
  invoiceTitle?: string | null;
  issuedAt?: string | null;
  status?: string;
  paymentStatus?: string;
  totalAmount?: number;
  paidAmount?: number;
  balanceDue?: number;
  currency?: string;
  supplierName?: string | null;
  supplierPhone?: string | null;
  supplierTaxId?: string | null;
  customerName?: string | null;
  lineItems?: Array<{
    label?: string;
    amount?: number;
  }>;
  billSettings?: BillSettings | null;
  shop?: {
    shopName?: string | null;
    city?: string | null;
    country?: string | null;
    logo?: string | null;
  } | null;
}

function formatMoney(amount: number | undefined | null, currency?: string) {
  const n = Number(amount ?? 0);
  return `${currency || "NPR"} ${n.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

export default function VerifyBillPage() {
  const params = useParams();
  const token = String(params?.token || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bill, setBill] = useState<VerifyBillResult | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid verification link");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await invoicesApi.verifyBill(token);
        if (cancelled) return;
        setBill(res.data as VerifyBillResult);
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err?.response?.data?.message ||
            "Bill not found or verification link invalid",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const branding = bill?.billSettings;
  const shopName = bill
    ? resolveBillShopName(
        branding,
        bill.supplierName,
        bill.shop?.shopName,
      )
    : "";
  const shopAddress = bill
    ? resolveBillShopAddress(branding, null)
    : "";
  const shopPhone = bill
    ? resolveBillShopPhone(branding, bill.supplierPhone)
    : "";
  const showLogo =
    branding?.showLogo !== false && Boolean(branding?.shopLogoUrl);
  const showAddress = branding?.showAddress !== false && Boolean(shopAddress);
  const showPhone = branding?.showPhone !== false && Boolean(shopPhone);
  const showGstin =
    branding?.showGstin !== false &&
    Boolean(branding?.gstin || bill?.supplierTaxId);
  const taxId = branding?.gstin?.trim() || bill?.supplierTaxId || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-zinc-950 dark:to-zinc-900 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-2xl font-serif font-semibold tracking-tight text-amber-900 dark:text-amber-200"
          >
            Orivraa
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            <T>Bill verification</T>
          </p>
        </div>

        <div className="rounded-2xl border bg-white/90 dark:bg-zinc-900/80 shadow-sm p-6 space-y-4">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>
                <T>Verifying bill…</T>
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <FileWarning className="h-12 w-12 text-amber-600" />
              <h1 className="text-xl font-semibold">
                <T>Could not verify this bill</T>
              </h1>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          {!loading && bill?.verified && (
            <>
              {["VOIDED", "CANCELLED"].includes(String(bill.status).toUpperCase()) ? (
                <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3">
                  <FileWarning className="h-8 w-8 text-red-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-red-800 dark:text-red-200 flex items-center gap-1.5">
                      <T>Bill voided / cancelled</T>
                    </p>
                    <p className="text-xs text-red-700/80 dark:text-red-300/80">
                      <T>This invoice was originally issued through Orivraa but has since been voided or cancelled by the seller.</T>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3">
                  <ShieldCheck className="h-8 w-8 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <T>Genuine Orivraa bill</T>
                    </p>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                      <T>This invoice was issued through Orivraa and matches our records.</T>
                    </p>
                  </div>
                </div>
              )}

              <div className="text-center space-y-1">
                {showLogo && branding?.shopLogoUrl && (
                  <div className="flex justify-center mb-2">
                    <Image
                      src={branding.shopLogoUrl}
                      alt="Shop logo"
                      width={64}
                      height={64}
                      className="h-14 w-auto object-contain"
                      unoptimized
                    />
                  </div>
                )}
                <h1 className="text-xl font-bold">{shopName || "Invoice"}</h1>
                {branding?.tagline && (
                  <p className="text-xs text-muted-foreground italic">
                    {branding.tagline}
                  </p>
                )}
                {showAddress && (
                  <p className="text-sm text-muted-foreground">{shopAddress}</p>
                )}
                {showPhone && (
                  <p className="text-sm text-muted-foreground">{shopPhone}</p>
                )}
                {showGstin && taxId && (
                  <p className="text-xs text-muted-foreground">
                    <T>Tax ID</T>: {taxId}
                  </p>
                )}
                {(bill.shop?.city || bill.shop?.country) && (
                  <p className="text-sm text-muted-foreground">
                    {[bill.shop?.city, bill.shop?.country]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                <p className="mt-2 font-mono text-base">{bill.invoiceNumber}</p>
                {bill.issuedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <T>Issued</T>:{" "}
                    {new Date(bill.issuedAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {bill.customerName && (
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    <T>Customer</T>:
                  </span>{" "}
                  {bill.customerName}
                </p>
              )}

              {bill.lineItems && bill.lineItems.length > 0 && (
                <div className="space-y-1 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <T>Items</T>
                  </p>
                  {bill.lineItems.slice(0, 12).map((li, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-sm gap-4"
                    >
                      <span className="truncate">{li.label || "Item"}</span>
                      <span className="shrink-0 font-medium">
                        {formatMoney(li.amount, bill.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between font-semibold text-lg">
                  <span>
                    <T>Total</T>
                  </span>
                  <span>{formatMoney(bill.totalAmount, bill.currency)}</span>
                </div>
                {bill.paidAmount != null && Number(bill.paidAmount) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-700">
                    <span>
                      <T>Paid</T>
                    </span>
                    <span>{formatMoney(bill.paidAmount, bill.currency)}</span>
                  </div>
                )}
                {bill.balanceDue != null && Number(bill.balanceDue) > 0.009 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>
                      <T>Balance due</T>
                    </span>
                    <span>{formatMoney(bill.balanceDue, bill.currency)}</span>
                  </div>
                )}
                {bill.status && (
                  <p className="text-xs text-muted-foreground pt-1">
                    <T>Status</T>: {String(bill.status).replace(/_/g, " ")}
                    {bill.paymentStatus
                      ? ` · ${String(bill.paymentStatus).replace(/_/g, " ")}`
                      : ""}
                  </p>
                )}
              </div>

              {branding?.showFooter !== false && branding?.footerNote && (
                <p className="text-xs text-center text-muted-foreground border-t pt-3">
                  {branding.footerNote}
                </p>
              )}
              {branding?.showTerms !== false && branding?.termsText && (
                <p className="text-[10px] text-center text-muted-foreground">
                  {branding.termsText}
                </p>
              )}
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <T>Powered by</T>{" "}
          <Link href="/" className="underline underline-offset-2">
            orivraa.com
          </Link>
        </p>
      </div>
    </div>
  );
}
