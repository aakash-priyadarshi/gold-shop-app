/**
 * Format a bill / invoice as plain text suitable for sharing via WhatsApp
 * (wa.me) or any text channel. Mobile mirror of the PC rate-card / tax-share
 * patterns.
 */

interface BillShareLineItem {
  label?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  amount?: number | null;
}

export interface BillShareInput {
  shopName?: string | null;
  shopPhone?: string | null;
  invoiceNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  currency?: string | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  taxLabel?: string | null;
  discountAmount?: number | null;
  totalAmount?: number | null;
  paidAmount?: number | null;
  balanceDue?: number | null;
  lineItems?: BillShareLineItem[] | null;
  issuedAt?: string | Date | null;
  publicUrl?: string | null;
}

function fmt(amount: number | null | undefined, currency: string) {
  const n = Number(amount ?? 0);
  return `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function buildBillShareText(bill: BillShareInput): string {
  const currency = bill.currency || "NPR";
  const lines: string[] = [];
  lines.push("🧾 *Bill*");
  if (bill.shopName) lines.push(`🏪 ${bill.shopName}`);
  if (bill.invoiceNumber) lines.push(`#${bill.invoiceNumber}`);
  if (bill.issuedAt) {
    const d = new Date(bill.issuedAt);
    lines.push(`📅 ${d.toLocaleDateString()}`);
  }
  if (bill.customerName) lines.push(`👤 ${bill.customerName}`);
  lines.push("");

  if (bill.lineItems && bill.lineItems.length > 0) {
    lines.push("*Items*");
    for (const it of bill.lineItems) {
      const qty = it.quantity ?? 1;
      const amt = it.amount ?? (it.unitPrice ?? 0) * qty;
      const label = it.label || "Item";
      lines.push(`• ${label}  x${qty}  —  ${fmt(amt, currency)}`);
    }
    lines.push("");
  }

  if (bill.subtotal != null) lines.push(`Subtotal: ${fmt(bill.subtotal, currency)}`);
  if (bill.discountAmount && bill.discountAmount > 0)
    lines.push(`Discount: -${fmt(bill.discountAmount, currency)}`);
  if (bill.taxAmount != null && bill.taxAmount > 0)
    lines.push(`${bill.taxLabel || "Tax"}: ${fmt(bill.taxAmount, currency)}`);
  if (bill.totalAmount != null)
    lines.push(`*Total: ${fmt(bill.totalAmount, currency)}*`);
  if (bill.paidAmount != null && bill.balanceDue != null && bill.balanceDue > 0) {
    lines.push(`Paid: ${fmt(bill.paidAmount, currency)}`);
    lines.push(`Balance: ${fmt(bill.balanceDue, currency)}`);
  }

  if (bill.publicUrl) {
    lines.push("");
    lines.push(bill.publicUrl);
  }

  if (bill.shopPhone) {
    lines.push("");
    lines.push(`📞 ${bill.shopPhone}`);
  }

  lines.push("");
  lines.push("Thank you for your business 🙏");
  return lines.join("\n");
}

/** Open WhatsApp share UI with the bill text prefilled. */
export function shareBillOnWhatsApp(bill: BillShareInput, recipientPhone?: string | null) {
  const text = encodeURIComponent(buildBillShareText(bill));
  const phone = (recipientPhone || "").replace(/[^0-9]/g, "");
  const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
