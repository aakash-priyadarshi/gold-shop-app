/** Shared popup print helper with country-aware invoice formatting. */

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
  fallbackShopName?: string;
  settings?: BillSettings | null;
  documentTitle?: string;
  invoiceNumber: string;
  invoiceCountry?: string;
  isTaxInvoice?: boolean;
  sellerTaxId?: string | null;
  supplierName?: string | null;
  supplierAddress?: string | null;
  supplierPhone?: string | null;
  customerTaxId?: string | null;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  issuedAt?: string | Date | null;
  supplyDate?: string | Date | null;
  placeOfSupply?: string | null;
  lineItems?: BillLineItem[];
  subtotal?: number;
  /** Explicit making total for the bill footer (when not already split in lines) */
  makingAmount?: number;
  /** Explicit wastage / jarti total */
  wastageAmount?: number;
  taxAmount?: number;
  taxLabel?: string;
  taxBreakdown?: {
    metalTax?: number;
    wastageTax?: number;
    makingTax?: number;
    gemstoneTax?: number;
  };
  discountAmount?: number;
  totalAmount: number;
  paidAmount?: number;
  balanceDue?: number;
  currency?: string;
  paymentMethod?: string | null;
  notes?: string | null;
  watermark?: boolean;
  /** Public QR verification token — renders a scannable code on the bill. */
  verificationToken?: string | null;
  /** Prefer a local data-URL QR; falls back to qrserver when absent. */
  verificationQrDataUrl?: string | null;
}

function safe(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt(amount: number, currency = "NPR"): string {
  const isLkr = currency.toUpperCase() === "LKR";
  return `${currency} ${Number(amount || 0).toLocaleString("en-LK", {
    minimumFractionDigits: isLkr ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(
  value?: string | Date | null,
  numericMonthFirst = false,
): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  if (numericMonthFirst) {
    return new Intl.DateTimeFormat("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }).format(date);
  }
  return date.toLocaleDateString("en-IN", {
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
  const current = settings || {};
  const parts: string[] = [];
  const wanted = (position?: string) =>
    zone === "TOP" ? isTop(position) : !isTop(position);

  if (
    current.showLogo !== false &&
    current.shopLogoUrl &&
    wanted(current.logoPosition)
  ) {
    parts.push(
      `<img src="${safe(current.shopLogoUrl)}" alt="Logo" class="logo" />`,
    );
  }
  const shopName = (current.shopNameOnBill || fallbackShopName || "").trim();
  if (shopName && wanted(current.shopNamePosition)) {
    parts.push(`<h2>${safe(shopName)}</h2>`);
  }
  if (current.tagline && wanted(current.taglinePosition)) {
    parts.push(`<p class="muted italic">${safe(current.tagline)}</p>`);
  }
  if (
    current.showAddress !== false &&
    current.shopAddress &&
    wanted(current.addressPosition)
  ) {
    parts.push(`<p class="muted">${safe(current.shopAddress)}</p>`);
  }
  const contacts: string[] = [];
  if (
    current.showPhone !== false &&
    current.shopPhone &&
    wanted(current.phonePosition)
  ) {
    contacts.push(safe(current.shopPhone));
  }
  if (
    current.showEmail &&
    current.shopEmail &&
    wanted(current.emailPosition)
  ) {
    contacts.push(safe(current.shopEmail));
  }
  if (contacts.length) parts.push(`<p class="muted">${contacts.join(" · ")}</p>`);
  if (
    current.showGstin !== false &&
    current.gstin &&
    wanted(current.gstinPosition)
  ) {
    parts.push(`<p class="muted">Tax ID: ${safe(current.gstin)}</p>`);
  }
  if (
    current.showLicense &&
    current.licenseNumber &&
    wanted(current.licensePosition)
  ) {
    parts.push(`<p class="muted">License: ${safe(current.licenseNumber)}</p>`);
  }
  if (
    current.showFooter !== false &&
    current.footerNote &&
    wanted(current.footerPosition)
  ) {
    parts.push(`<p class="footer">${safe(current.footerNote)}</p>`);
  }
  if (
    current.showTerms !== false &&
    current.termsText &&
    wanted(current.termsPosition)
  ) {
    parts.push(`<p class="footer">${safe(current.termsText)}</p>`);
  }
  return parts.join("\n");
}

export function buildBillHtml(payload: BillPrintPayload): string {
  const isSriLanka = payload.invoiceCountry?.toUpperCase() === "LK";
  const currency = isSriLanka ? "LKR" : payload.currency || "NPR";
  const sellerTin = String(payload.sellerTaxId || payload.settings?.gstin || "").trim();
  const purchaserTin = String(payload.customerTaxId || "").trim();
  const validTin = (value: string) => /^\d{9}$/.test(value);
  const isLkTaxInvoice = Boolean(
    isSriLanka &&
      payload.isTaxInvoice &&
      validTin(sellerTin) &&
      validTin(purchaserTin),
  );
  const heading = isSriLanka
    ? isLkTaxInvoice
      ? "TAX INVOICE"
      : "INVOICE / RECEIPT"
    : payload.documentTitle || "INVOICE";

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
  const paid = payload.paidAmount ?? 0;
  const balance =
    payload.balanceDue ?? Math.max(0, (payload.totalAmount || 0) - paid);
  const exVatTotal = Math.max(
    0,
    Number(payload.totalAmount || 0) - Number(payload.taxAmount || 0),
  );

  const standardLines = (payload.lineItems || [])
    .map((item) => {
      const quantity =
        item.quantity && item.quantity !== 1 ? ` × ${item.quantity}` : "";
      return `<div class="row"><span class="label">${safe(item.label)}${quantity}${
        item.details ? `<br/><span class="tiny">${safe(item.details)}</span>` : ""
      }</span><span class="value">${safe(fmt(item.amount, currency))}</span></div>`;
    })
    .join("");

  const taxInvoiceLines = (payload.lineItems || [])
    .map(
      (item) => `<tr>
        <td>${safe(item.label)}${item.details ? `<div class="tiny">${safe(item.details)}</div>` : ""}</td>
        <td class="number">${safe(item.quantity ?? 1)}</td>
        <td class="number">${safe(fmt(item.amount, "LKR"))}</td>
      </tr>`,
    )
    .join("");

  const supplierName =
    payload.supplierName ||
    payload.settings?.shopNameOnBill ||
    payload.fallbackShopName ||
    "";
  const supplierAddress =
    payload.supplierAddress || payload.settings?.shopAddress || "";
  const supplierPhone =
    payload.supplierPhone || payload.settings?.shopPhone || "";
  const watermarkCss = payload.watermark
    ? `.wm{position:fixed;inset:0;pointer-events:none;z-index:9999;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='250' height='250'><text fill='rgba(220,38,38,0.12)' font-family='sans-serif' font-weight='bold' font-size='14' x='20' y='180' transform='rotate(-45 100 100)'>DEMO BILL - NOT FOR COMMERCIAL SALE</text></svg>");background-repeat:repeat;}`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8">
<title>${safe(heading)} ${safe(payload.invoiceNumber)}</title>
<style>
*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;padding:28px 24px;max-width:${isLkTaxInvoice ? "760px" : "460px"};margin:0 auto;position:relative}
h1.doc-title{text-align:center;font-size:24px;letter-spacing:.08em;margin:8px 0 18px;color:#111827}h2{margin:0 0 2px;font-size:18px;color:#b45309}.logo{max-height:56px;max-width:160px;object-fit:contain;margin-bottom:8px}
.muted{color:#6b7280;font-size:11px;margin:0 0 6px}.italic{font-style:italic}.tiny{color:#6b7280;font-size:10px;font-weight:400}.divider{border:none;border-top:1px solid #e5e7eb;margin:12px 0}
.row{display:flex;justify-content:space-between;gap:12px;padding:5px 0;font-size:13px}.label{color:#6b7280;flex:1}.value{font-weight:600;white-space:nowrap}.total-row{display:flex;justify-content:space-between;padding:8px 0 0;font-size:16px;font-weight:700;border-top:2px solid #1f2937;margin-top:6px}
.amt-paid{color:#065f46;font-weight:700}.amt-due{color:#b45309;font-weight:700}.footer{margin-top:12px;font-size:10px;color:#9ca3af;text-align:center}.parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:12px 0}.party{border:1px solid #d1d5db;border-radius:8px;padding:12px}.party h3{font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 7px}.party p{font-size:12px;margin:3px 0}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;margin:12px 0;font-size:12px}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:12px}th,td{border:1px solid #d1d5db;padding:7px;text-align:left}th{background:#f3f4f6}.number{text-align:right;white-space:nowrap}.lk-totals{margin-left:auto;width:min(100%,340px)}
@media print{button{display:none}}${watermarkCss}
</style></head><body>
${payload.watermark ? '<div class="wm"></div>' : ""}
<button onclick="window.print()" style="position:fixed;top:12px;right:12px;padding:7px 14px;background:#b45309;color:#fff;border:0;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">Print / Save PDF</button>
<h1 class="doc-title">${heading}</h1>
${topBrand || `<h2>${safe(payload.fallbackShopName || "Receipt")}</h2>`}
${
  isLkTaxInvoice
    ? `<div class="parties">
        <section class="party"><h3>Supplier</h3><p><strong>Name:</strong> ${safe(supplierName)}</p><p><strong>TIN:</strong> ${safe(sellerTin)}</p><p><strong>Address:</strong> ${safe(supplierAddress)}</p>${supplierPhone ? `<p><strong>Telephone:</strong> ${safe(supplierPhone)}</p>` : ""}</section>
        <section class="party"><h3>Purchaser</h3><p><strong>Name:</strong> ${safe(payload.customerName)}</p><p><strong>TIN:</strong> ${safe(purchaserTin)}</p><p><strong>Address:</strong> ${safe(payload.customerAddress || "")}</p>${payload.customerPhone ? `<p><strong>Telephone:</strong> ${safe(payload.customerPhone)}</p>` : ""}</section>
      </div>
      <div class="meta-grid"><div><strong>Invoice number:</strong> ${safe(payload.invoiceNumber)}</div><div><strong>Invoice date:</strong> ${safe(formatDate(payload.issuedAt, true))}</div><div><strong>Date of supply:</strong> ${safe(formatDate(payload.supplyDate, true))}</div>${payload.placeOfSupply ? `<div><strong>Place of supply:</strong> ${safe(payload.placeOfSupply)}</div>` : ""}${payload.paymentMethod ? `<div><strong>Mode of payment:</strong> ${safe(payload.paymentMethod.replace(/_/g, " "))}</div>` : ""}</div>
      <table><thead><tr><th>Description</th><th class="number">Quantity / volume</th><th class="number">Value excluding VAT</th></tr></thead><tbody>${taxInvoiceLines}</tbody></table>
      <div class="lk-totals"><div class="row"><span class="label">Value excluding VAT</span><span class="value">${safe(fmt(exVatTotal, "LKR"))}</span></div><div class="row"><span class="label">VAT</span><span class="value">${safe(fmt(payload.taxAmount || 0, "LKR"))}</span></div><div class="total-row"><span>Total including VAT</span><span>${safe(fmt(payload.totalAmount, "LKR"))}</span></div></div>`
    : `<hr class="divider"/><div class="row"><span class="label">Invoice</span><span class="value">${safe(payload.invoiceNumber)}</span></div>
      ${payload.customerName ? `<div class="row"><span class="label">Customer</span><span class="value">${safe(payload.customerName)}</span></div>` : ""}
      ${payload.customerPhone ? `<div class="row"><span class="label">Phone</span><span class="value">${safe(payload.customerPhone)}</span></div>` : ""}
      ${payload.customerEmail ? `<div class="row"><span class="label">Email</span><span class="value">${safe(payload.customerEmail)}</span></div>` : ""}
      ${payload.customerAddress ? `<div class="row"><span class="label">Address</span><span class="value">${safe(payload.customerAddress)}</span></div>` : ""}
      <div class="row"><span class="label">Date</span><span class="value">${safe(formatDate(payload.issuedAt))}</span></div>
      ${payload.paymentMethod ? `<div class="row"><span class="label">Payment mode</span><span class="value">${safe(payload.paymentMethod.replace(/_/g, " "))}</span></div>` : ""}<hr class="divider"/>${standardLines}
      ${payload.subtotal != null ? `<div class="row"><span class="label">Subtotal</span><span class="value">${safe(fmt(payload.subtotal, currency))}</span></div>` : ""}
      ${payload.makingAmount ? `<div class="row"><span class="label">Incl. making</span><span class="value">${safe(fmt(payload.makingAmount, currency))}</span></div>` : ""}
      ${payload.wastageAmount ? `<div class="row"><span class="label">Incl. wastage</span><span class="value">${safe(fmt(payload.wastageAmount, currency))}</span></div>` : ""}
      ${payload.discountAmount ? `<div class="row"><span class="label">Discount</span><span class="value">-${safe(fmt(payload.discountAmount, currency))}</span></div>` : ""}
      ${payload.taxAmount ? `<div class="row"><span class="label">${safe(payload.taxLabel || "Tax")}</span><span class="value">${safe(fmt(payload.taxAmount, currency))}</span></div>` : ""}
      ${
        payload.taxBreakdown &&
        (payload.taxBreakdown.metalTax ||
          payload.taxBreakdown.wastageTax ||
          payload.taxBreakdown.makingTax ||
          payload.taxBreakdown.gemstoneTax)
          ? `<div class="tiny" style="margin:2px 0 6px 8px;line-height:1.5">
              ${payload.taxBreakdown.metalTax ? `Metal tax: ${safe(fmt(payload.taxBreakdown.metalTax, currency))}<br/>` : ""}
              ${payload.taxBreakdown.wastageTax ? `Wastage tax: ${safe(fmt(payload.taxBreakdown.wastageTax, currency))}<br/>` : ""}
              ${payload.taxBreakdown.makingTax ? `Making tax: ${safe(fmt(payload.taxBreakdown.makingTax, currency))}<br/>` : ""}
              ${payload.taxBreakdown.gemstoneTax ? `Gemstone tax: ${safe(fmt(payload.taxBreakdown.gemstoneTax, currency))}` : ""}
            </div>`
          : ""
      }
      <div class="total-row"><span>Total</span><span>${safe(fmt(payload.totalAmount, currency))}</span></div>`
}
${paid > 0 ? `<div class="row" style="padding-top:8px"><span class="label">Paid</span><span class="amt-paid">${safe(fmt(paid, currency))}</span></div>` : ""}
${balance > 0.009 ? `<div class="row"><span class="label">Balance due</span><span class="amt-due">${safe(fmt(balance, currency))}</span></div>` : ""}
${payload.notes ? `<p class="muted" style="margin-top:12px">${safe(payload.notes)}</p>` : ""}
${
  payload.verificationToken
    ? (() => {
        const verifyUrl = `https://www.orivraa.com/verify-bill/${payload.verificationToken}`;
        const qrSrc =
          payload.verificationQrDataUrl ||
          `https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=4&data=${encodeURIComponent(verifyUrl)}`;
        return `<div style="text-align:center;margin-top:14px;padding-top:10px;border-top:1px dashed #e5e7eb">
        <img src="${qrSrc}" alt="Verify bill" style="width:88px;height:88px;margin:0 auto" />
        <p class="tiny" style="margin-top:4px">Scan to verify this bill is genuine</p>
      </div>`;
      })()
    : ""
}
${bottomBrand || '<p class="footer">Thank you for your business!</p>'}
<script>setTimeout(function(){window.print();},350);</script></body></html>`;
}

export function printBill(payload: BillPrintPayload): boolean {
  const printWindow = window.open("", "_blank", "width=820,height=900");
  if (!printWindow) return false;
  printWindow.document.write(buildBillHtml(payload));
  printWindow.document.close();
  return true;
}
