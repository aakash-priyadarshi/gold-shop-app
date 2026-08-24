export type PosRefundStatus = "SETTLED" | "CREDIT_ISSUED" | "PENDING" | string | null | undefined;

const formatAmount = (amount: number, currency: string) =>
  `${currency} ${Number(amount || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;

/** Copy based on the POS return persisted by the server, never a browser estimate. */
export function getPosReturnCompletionMessage(
  refundStatus: PosRefundStatus,
  refundAmount: number,
  currency: string,
) {
  const amount = formatAmount(refundAmount, currency);
  if (refundStatus === "CREDIT_ISSUED") {
    return {
      title: "Return completed",
      description: `Return completed — store credit of ${amount} issued.`,
    };
  }
  if (refundStatus === "PENDING") {
    return {
      title: "Return recorded",
      description: `Return recorded — refund/reversal of ${amount} is pending.`,
    };
  }
  return {
    title: "Return completed",
    description: `Return completed — refund of ${amount} issued.`,
  };
}

/** Use the persisted invoice state for customer-facing POS share text. */
export function getPosWhatsAppPaymentStatus(
  paymentStatus: string | null | undefined,
  balanceDue: number | null | undefined,
  currency: string,
) {
  if (paymentStatus === "PAID") return "Paid";
  if (paymentStatus === "PARTIALLY_PAID") {
    return `Partially paid — balance: ${formatAmount(Number(balanceDue || 0), currency)}`;
  }
  return "Payment pending";
}
