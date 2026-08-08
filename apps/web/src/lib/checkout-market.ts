export interface CheckoutPaymentMethod {
  id: "ESEWA" | "KHALTI" | "RAZORPAY" | "STRIPE" | "BANK_TRANSFER";
  name: string;
  description: string;
  icon: "bank" | "card";
  available: boolean;
}

export const CHECKOUT_COUNTRIES = [
  { code: "NP", name: "Nepal" },
  { code: "IN", name: "India" },
  { code: "LK", name: "Sri Lanka" },
  { code: "US", name: "United States" },
  { code: "UK", name: "United Kingdom" },
  { code: "EU", name: "Europe" },
  { code: "AE", name: "UAE" },
] as const;

const STRIPE: CheckoutPaymentMethod = {
  id: "STRIPE",
  name: "Credit/Debit Card",
  description: "Continue to secure Stripe Checkout",
  icon: "card",
  available: true,
};

const BANK_TRANSFER: CheckoutPaymentMethod = {
  id: "BANK_TRANSFER",
  name: "Bank Transfer",
  description: "Confirm the order and pay by bank transfer",
  icon: "bank",
  available: true,
};

const PAYMENT_METHODS_BY_COUNTRY: Record<string, CheckoutPaymentMethod[]> = {
  NP: [
    {
      id: "ESEWA",
      name: "eSewa",
      description: "Pay via eSewa wallet",
      icon: "bank",
      available: true,
    },
    {
      id: "KHALTI",
      name: "Khalti",
      description: "Pay via Khalti wallet",
      icon: "bank",
      available: true,
    },
    BANK_TRANSFER,
  ],
  IN: [
    {
      id: "RAZORPAY",
      name: "Razorpay",
      description: "UPI, cards and net banking",
      icon: "card",
      available: true,
    },
    BANK_TRANSFER,
  ],
  LK: [STRIPE, BANK_TRANSFER],
  US: [STRIPE],
  UK: [STRIPE],
  EU: [STRIPE],
  AE: [STRIPE, BANK_TRANSFER],
};

export function getCheckoutPaymentMethods(
  country?: string,
): CheckoutPaymentMethod[] {
  const normalized = country?.trim().toUpperCase() || "";
  // Stripe is the configured global fallback. Never substitute Nepal wallets
  // for a country that is missing from this frontend map.
  return PAYMENT_METHODS_BY_COUNTRY[normalized] || [STRIPE];
}

export function toPreferredGateway(methodId: string): string {
  if (methodId === "BANK_TRANSFER") return "manual";
  return methodId.trim().toLowerCase();
}

export interface PendingCheckoutOrder {
  id: string;
  orderNumber: string;
  amount: number;
  currency: string;
  country: string;
  preferredGateway: string;
  idempotencyKey: string;
}

export const PENDING_CHECKOUT_STORAGE_KEY = "orivraa_pending_order_checkout";
export const COMPLETED_CHECKOUT_STORAGE_KEY = "orivraa_completed_order_checkout";

export function createOrderPaymentAttemptKey(
  orderId: string,
  attemptId = globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`,
): string {
  return `order:${orderId}:${attemptId}`.slice(0, 128);
}

export function isOrderPaid(order: Record<string, unknown> | null | undefined) {
  if (!order) return false;
  const paymentStatus = String(order.paymentStatus || "").toUpperCase();
  const orderStatus = String(order.status || "").toUpperCase();
  return (
    ["COMPLETED", "PAID", "SUCCEEDED"].includes(paymentStatus) ||
    ["COMPLETED", "PAID"].includes(orderStatus) ||
    (typeof order.balanceDueNpr === "number" && order.balanceDueNpr <= 0)
  );
}
