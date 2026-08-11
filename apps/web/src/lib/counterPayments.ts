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

/** Manual counter methods — record payment by hand (no live wallet/QR rails). */
const MANUAL_COUNTER_METHODS: CounterPaymentMethod[] = [
  "CASH",
  "CARD",
  "BANK_TRANSFER",
];

const METHODS_BY_COUNTRY: Record<string, CounterPaymentMethod[]> = {
  // Preference / invoice country drives which rails appear (same idea as tax).
  IN: ["CASH", "UPI", "PHONEPE", "CARD", "BANK_TRANSFER"],
  NP: ["CASH", "ESEWA", "KHALTI", "CARD", "BANK_TRANSFER"],
  // Sri Lanka and other markets: no UPI/PhonePe/eSewa — manual only for now.
  LK: MANUAL_COUNTER_METHODS,
  AE: MANUAL_COUNTER_METHODS,
  US: MANUAL_COUNTER_METHODS,
  UK: MANUAL_COUNTER_METHODS,
  GB: MANUAL_COUNTER_METHODS,
  EU: MANUAL_COUNTER_METHODS,
};

/**
 * Country-aware counter payment options.
 * Pass the same country used for tax (invoice country / preference), not only shop KYC.
 */
export function getCounterPaymentMethods(
  country?: string | null,
): ReadonlyArray<(typeof COUNTER_PAYMENT_METHODS)[number]> {
  const c = (country || "").trim().toUpperCase();
  const allowed = METHODS_BY_COUNTRY[c] || MANUAL_COUNTER_METHODS;
  return COUNTER_PAYMENT_METHODS.filter((m) => allowed.includes(m.value));
}

export function isDigitalWalletMethod(method?: string | null): boolean {
  const m = (method || "").toUpperCase();
  return m === "UPI" || m === "PHONEPE";
}

export function paymentMethodLabel(method?: string | null): string {
  if (!method) return "";
  const m = method.toUpperCase();
  if (m === "SPLIT") return "Split";
  const found = COUNTER_PAYMENT_METHODS.find((x) => x.value === m);
  return found?.label || method.replace(/_/g, " ");
}

/** NPCI typical per-transaction UPI QR / intent limit (INR). */
export const UPI_MAX_AMOUNT_INR = 100_000;

/**
 * Whether a UPI/PhonePe amount is within the ₹1 lakh limit.
 * Non-digital-wallet methods always return true.
 */
export function isUpiAmountAllowed(
  amount: number,
  method?: string | null,
): boolean {
  if (!isDigitalWalletMethod(method)) return true;
  if (!Number.isFinite(amount) || amount <= 0) return true;
  return amount <= UPI_MAX_AMOUNT_INR;
}

export interface ShopBankAccountDetails {
  bankName?: string | null;
  branchName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  swiftCode?: string | null;
  ifsc?: string | null;
  upiId?: string | null;
  phonePeMerchantRef?: string | null;
  posTerminalId?: string | null;
  posTerminalProvider?: string | null;
}

/** Human-readable bank transfer lines for dialogs / receipts. */
export function formatBankAccountDetails(
  details?: ShopBankAccountDetails | null,
): string[] {
  if (!details || typeof details !== "object") return [];
  const lines: string[] = [];
  if (details.accountName?.trim()) {
    lines.push(`Account name: ${details.accountName.trim()}`);
  }
  if (details.accountNumber?.trim()) {
    lines.push(`Account number: ${details.accountNumber.trim()}`);
  }
  if (details.bankName?.trim()) {
    lines.push(`Bank: ${details.bankName.trim()}`);
  }
  if (details.branchName?.trim()) {
    lines.push(`Branch: ${details.branchName.trim()}`);
  }
  const ifscOrSwift =
    details.ifsc?.trim() || details.swiftCode?.trim() || "";
  if (ifscOrSwift) {
    lines.push(
      `${details.ifsc?.trim() ? "IFSC" : "IFSC / SWIFT"}: ${ifscOrSwift}`,
    );
  }
  return lines;
}

export function hasBankTransferDetails(
  details?: ShopBankAccountDetails | null,
): boolean {
  return formatBankAccountDetails(details).length > 0;
}

/** e.g. "Cash 50,000 + Card 50,000" for split receipts. */
export function formatPaymentSummary(
  legs: Array<{ method: string; amount: number }>,
  currency?: string,
): string {
  const parts = legs
    .filter((l) => l.amount > 0)
    .map((l) => {
      const label = paymentMethodLabel(l.method);
      const amt = Number(l.amount || 0).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      });
      return currency ? `${label} ${currency} ${amt}` : `${label} ${amt}`;
    });
  return parts.join(" + ");
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
  if (!isUpiAmountAllowed(opts.amount, "UPI")) return null;
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

export type ShopPaymentAccounts = ShopBankAccountDetails;

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
