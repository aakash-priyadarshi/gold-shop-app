/**
 * Shared bill/receipt print helper.
 * Opens a clean popup (avoids printing dashboard chrome) and applies
 * InvoiceSettings branding when available.
 */

export interface BillSettings {
  shopNameOnBill?: string | null;
  shopLogoUrl?: string | null;
  tagline?: string | null;
  shopAddress?: string | null;
  shopPhone?: string | null;
  shopEmail?: string | null;
  gstin?: string | null;
  licenseNumber?: string | null;
  footerNote?: string | null;
  termsText?: string | null;
  shopNamePosition?: string;
  logoPosition?: string;
  taglinePosition?: string;
  addressPosition?: string;
  phonePosition?: string;
  emailPosition?: string;
  gstinPosition?: string;
  licensePosition?: string;
  footerPosition?: string;
  termsPosition?: string;
  showLogo?: boolean;
  showAddress?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
  showGstin?: boolean;
  showLicense?: boolean;
  showFooter?: boolean;
  showTerms?: boolean;
}

export interface BillLineItem {
  label: string;
  quantity?: number;
  amount: number;
  details?: string;
}

export interface BillPrintPayload {
  /** Fallback shop name when settings.shopNameOnBill is blank */
  fallbackShopName?: string;
  settings?: BillSettings | null;
  documentTitle?: string;
  invoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  issuedAt?: string | Date | null;
  lineItems?: BillLineItem[];
  subtotal?: number;
  taxAmount?: number;
  taxLabel?: string;
  discountAmount?: number;
  totalAmount: number;
  paidAmount?: number;
  balanceDue?: number;
  currency?: string;
  paymentMethod?: string | null;
  notes?: string | null;
  watermark?: boolean;
}

function safe(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt(amount: number, currency = "NPR"): string {
  return `${currency} ${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string | Date | null): string {
  if (!value) return new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isTop(position?: string): boolean {
  return (position || "TOP").toUpperCase() !== "BOTTOM";
}

function renderBrandingBlock(
  settings: BillSettings | null | undefined,
  fallbackShopName: string | undefined,
  zone: "TOP" | "BOTTOM",
): string {
  const s = settings || {};
  const parts: string[] = [];
  const want = (pos?: string) =>
    zone === "TOP" ? isTop(pos) : !isTop(pos);

  if (s.showLogo !== false && s.shopLogoUrl && want(s.logoPosition)) {
    parts.push(
      `<img src="${safe(s.shopLogoUrl)}" alt="Logo" style="max-height:56px;max-width:160px;object-fit:contain;margin-bottom:8px" />`,
    );
  }

  const shopName = (s.shopNameOnBill || fallbackShopName || "").trim();
  if (shopName && want(s.shopNamePosition)) {
    parts.push(`<h2>${safe(shopName)}</h2>`);
  }

  if (s.tagline && want(s.taglinePosition)) {
    parts.push(`<p class="muted" style="font-style:italic">${safe(s.tagline)}</p>`);
  }

  if (s.showAddress !== false && s.shopAddress && want(s.addressPosition)) {
    parts.push(`<p class="muted">${safe(s.shopAddress)}</p>`);
  }

  const contactBits: string[] = [];
  if (s.showPhone !== false && s.shopPhone && want(s.phonePosition)) {
    contactBits.push(safe(s.shopPhone));
  }
  if (s.showEmail && s.shopEmail && want(s.emailPosition)) {
    contactBits.push(safe(s.shopEmail));
  }
  if (contactBits.length) {
    parts.push(`<p class="muted">${contactBits.join(" · ")}</p>`);
  }

  if (s.showGstin !== false && s.gstin && want(s.gstinPosition)) {
    parts.push(`<p class="muted">Tax ID: ${safe(s.gstin)}</p>`);
  }
  if (s.showLicense && s.licenseNumber && want(s.licensePosition)) {
    parts.push(`<p class="muted">License: ${safe(s.licenseNumber)}</p>`);
  }

  if (s.showFooter !== false && s.footerNote && want(s.footerPosition)) {
    parts.push(`<p class="footer">${safe(s.footerNote)}</p>`);
  }
  if (s.showTerms !== false && s.termsText && want(s.termsPosition)) {
    parts.push(`<p class="footer">${safe(s.termsText)}</p>`);
  }

  return parts.join("\n");
}

/**
 * Open a dedicated print window and trigger the browser print dialog.
 * Returns false if the popup was blocked.
 */
export function printBill(payload: BillPrintPayload): boolean {
  const printWindow = window.open("", "_blank", "width=520,height=900");
  if (!printWindow) return false;

  const currency = payload.currency || "NPR";
  const topBrand = renderBrandingBlock(
    payload.settings,
    payload.fallbackShopName,
    "TOP",
  );
  const bottomBrand = renderBrandingBlock(
    payload.settings,
    payload.fallbackShopName,
    "BOTTOM",
  );

  const lines = (payload.lineItems || [])
    .map((li) => {
      const qty =
        li.quantity && li.quantity !== 1 ? ` × ${li.quantity}` : "";
      return `<div class="row"><span class="label">${safe(li.label)}${qty}${
        li.details ? `<br/><span class="tiny">${safe(li.details)}</span>` : ""
      }</span><span class="value">${safe(fmt(li.amount, currency))}</span></div>`;
    })
    .join("");

  const paid = payload.paidAmount ?? 0;
  const balance =
    payload.balanceDue ??
    Math.max(0, (payload.totalAmount || 0) - paid);

  const watermarkCss = payload.watermark
    ? `.wm{position:fixed;inset:0;pointer-events:none;z-index:9999;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='250' height='250'><text fill='rgba(220,38,38,0.12)' font-family='sans-serif' font-weight='bold' font-size='14' x='20' y='180' transform='rotate(-45 100 100)'>DEMO BILL - NOT FOR COMMERCIAL SALE</text></svg>");background-repeat:repeat;}`
    : "";

  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${safe(payload.documentTitle || payload.invoiceNumber)}</title>
<style>
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;padding:28px 24px;max-width:420px;margin:0 auto;position:relative}
h2{margin:0 0 2px;font-size:18px;color:#b45309}
.muted{color:#6b7280;font-size:11px;margin:0 0 6px}
.tiny{color:#9ca3af;font-size:10px;font-weight:400}
.divider{border:none;border-top:1px solid #e5e7eb;margin:12px 0}
.row{display:flex;justify-content:space-between;gap:12px;padding:5px 0;font-size:13px}
.label{color:#6b7280;flex:1}.value{font-weight:600;white-space:nowrap}
.total-row{display:flex;justify-content:space-between;padding:8px 0 0;font-size:16px;font-weight:700;border-top:2px solid #1f2937;margin-top:6px}
.amt-paid{color:#065f46;font-weight:700}
.amt-due{color:#b45309;font-weight:700}
.footer{margin-top:12px;font-size:10px;color:#9ca3af;text-align:center}
@media print{button{display:none}}
${watermarkCss}
</style>
</head><body>
${payload.watermark ? '<div class="wm"></div>' : ""}
<button onclick="window.print()" style="position:fixed;top:12px;right:12px;padding:7px 14px;background:#b45309;color:#fff;border:0;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">Print / Save PDF</button>
${topBrand || `<h2>${safe(payload.fallbackShopName || "Receipt")}</h2>`}
<hr class="divider"/>
<div class="row"><span class="label">Invoice</span><span class="value">${safe(payload.invoiceNumber)}</span></div>
${payload.customerName ? `<div class="row"><span class="label">Customer</span><span class="value">${safe(payload.customerName)}</span></div>` : ""}
${payload.customerPhone ? `<div class="row"><span class="label">Phone</span><span class="value">${safe(payload.customerPhone)}</span></div>` : ""}
${payload.customerEmail ? `<div class="row"><span class="label">Email</span><span class="value">${safe(payload.customerEmail)}</span></div>` : ""}
${payload.customerAddress ? `<div class="row"><span class="label">Address</span><span class="value">${safe(payload.customerAddress)}</span></div>` : ""}
<div class="row"><span class="label">Date</span><span class="value">${safe(formatDate(payload.issuedAt))}</span></div>
${payload.paymentMethod ? `<div class="row"><span class="label">Paid via</span><span class="value">${safe(payload.paymentMethod.replace(/_/g, " "))}</span></div>` : ""}
<hr class="divider"/>
${lines}
${
  payload.subtotal != null
    ? `<div class="row"><span class="label">Subtotal</span><span class="value">${safe(fmt(payload.subtotal, currency))}</span></div>`
    : ""
}
${
  payload.discountAmount
    ? `<div class="row"><span class="label">Discount</span><span class="value">-${safe(fmt(payload.discountAmount, currency))}</span></div>`
    : ""
}
${
  payload.taxAmount
    ? `<div class="row"><span class="label">${safe(payload.taxLabel || "Tax")}</span><span class="value">${safe(fmt(payload.taxAmount, currency))}</span></div>`
    : ""
}
<div class="total-row"><span>Total</span><span>${safe(fmt(payload.totalAmount, currency))}</span></div>
${
  paid > 0
    ? `<div class="row" style="padding-top:8px"><span class="label">Paid</span><span class="amt-paid">${safe(fmt(paid, currency))}</span></div>`
    : ""
}
${
  balance > 0.009
    ? `<div class="row"><span class="label">Balance due</span><span class="amt-due">${safe(fmt(balance, currency))}</span></div>`
    : ""
}
${payload.notes ? `<p class="muted" style="margin-top:12px">${safe(payload.notes)}</p>` : ""}
${bottomBrand || `<p class="footer">Thank you for your business!</p>`}
<script>setTimeout(function(){window.print();},350);</script>
</body></html>`);
  printWindow.document.close();
  return true;
}
