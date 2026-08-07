/**
 * Counter payment helpers for invoices / POS.
 *
 * Phase 1 (shipped): payment method labels + UPI deep-link QR for counter collection.
 * Phase 2 (future): hardware POS terminals / PhonePe Soundbox / Pine Labs —
 * implement against PaymentTerminalAdapter below without rewriting checkout UI.
 */

export const COUNTER_PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "PHONEPE", label: "PhonePe" },
  { value: "CARD", label: "Card" },
  { value: "ESEWA", label: "eSewa" },
  { value: "KHALTI", label: "Khalti" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
] as const;

export type CounterPaymentMethod =
  (typeof COUNTER_PAYMENT_METHODS)[number]["value"];

export function isDigitalWalletMethod(method?: string | null): boolean {
  const m = (method || "").toUpperCase();
  return m === "UPI" || m === "PHONEPE";
}

export function paymentMethodLabel(method?: string | null): string {
  if (!method) return "";
  const found = COUNTER_PAYMENT_METHODS.find(
    (m) => m.value === method.toUpperCase(),
  );
  return found?.label || method.replace(/_/g, " ");
}

/** Build a standard UPI intent URI for QR display / deep link. */
export function buildUpiPayUri(opts: {
  upiId: string;
  amount: number;
  currency?: string;
  payeeName?: string;
  note?: string;
  transactionRef?: string;
}): string | null {
  const pa = (opts.upiId || "").trim();
  if (!pa || !opts.amount || opts.amount <= 0) return null;
  const params = new URLSearchParams({
    pa,
    am: opts.amount.toFixed(2),
    cu: opts.currency || "INR",
  });
  if (opts.payeeName) params.set("pn", opts.payeeName);
  if (opts.note) params.set("tn", opts.note.slice(0, 80));
  if (opts.transactionRef) params.set("tr", opts.transactionRef.slice(0, 35));
  return `upi://pay?${params.toString()}`;
}

/** Free QR image URL (same pattern used elsewhere in the app for catalogue QR). */
export function buildQrImageUrl(data: string, size = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export interface ShopPaymentAccounts {
  upiId?: string | null;
  phonePeMerchantRef?: string | null;
  /** Reserved for future terminal / soundbox pairing */
  posTerminalId?: string | null;
  posTerminalProvider?: string | null;
}

/**
 * Future hardware POS / soundbox adapter.
 * Checkout UI should call this instead of provider-specific SDKs so option 3
 * can plug in without rewriting bill flows.
 */
export interface PaymentTerminalChargeRequest {
  amount: number;
  currency: string;
  invoiceNumber?: string;
  paymentMethod: CounterPaymentMethod;
  metadata?: Record<string, string>;
}

export interface PaymentTerminalChargeResult {
  success: boolean;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "UNSUPPORTED";
  gatewayPaymentId?: string;
  message?: string;
}

export interface PaymentTerminalAdapter {
  readonly provider: string;
  isAvailable(): Promise<boolean>;
  charge(
    request: PaymentTerminalChargeRequest,
  ): Promise<PaymentTerminalChargeResult>;
}

/** Stub adapter — replace with Pine Labs / PhonePe Soundbox / etc. later. */
export class UnsupportedPaymentTerminalAdapter
  implements PaymentTerminalAdapter
{
  readonly provider = "none";

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async charge(
    _request: PaymentTerminalChargeRequest,
  ): Promise<PaymentTerminalChargeResult> {
    return {
      success: false,
      status: "UNSUPPORTED",
      message:
        "Hardware POS terminal is not connected yet. Use UPI QR or record payment manually.",
    };
  }
}

let activeTerminalAdapter: PaymentTerminalAdapter =
  new UnsupportedPaymentTerminalAdapter();

export function getPaymentTerminalAdapter(): PaymentTerminalAdapter {
  return activeTerminalAdapter;
}

/** Call this when a real terminal SDK is wired (future option 3). */
export function registerPaymentTerminalAdapter(
  adapter: PaymentTerminalAdapter,
): void {
  activeTerminalAdapter = adapter;
}
