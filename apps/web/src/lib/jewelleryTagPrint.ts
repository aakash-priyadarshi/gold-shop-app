/**
 * Browser jewellery tag / label printing.
 * Opens a popup with printable tags (small label + A4 multi-up).
 * Future ZPL thermal support is stubbed in posHardware.ts.
 */

export interface JewelleryTagItem {
  sku: string;
  name: string;
  purity?: string | null;
  weightGrams?: number | null;
  price?: number | null;
  currency?: string | null;
  hallmark?: string | null;
  shopName?: string | null;
}

function safe(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtPrice(amount: number | null | undefined, currency = "NPR"): string {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  return `${currency} ${Number(amount).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function barcodeSvg(sku: string): string {
  // Simple Code128-like bars from character codes (visual only — scanners use human-readable SKU).
  const bars: string[] = [];
  let x = 0;
  const text = sku.slice(0, 24);
  for (let i = 0; i < text.length; i++) {
    const n = text.charCodeAt(i);
    const w1 = (n % 3) + 1;
    const w2 = ((n >> 2) % 3) + 1;
    bars.push(
      `<rect x="${x}" y="0" width="${w1}" height="36" fill="#111"/>`,
    );
    x += w1 + 1;
    bars.push(
      `<rect x="${x}" y="0" width="${w2}" height="36" fill="#111"/>`,
    );
    x += w2 + 2;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(x, 80)}" height="36" viewBox="0 0 ${Math.max(x, 80)} 36">${bars.join("")}</svg>`;
}

function tagHtml(item: JewelleryTagItem): string {
  const weight =
    item.weightGrams != null
      ? `${Number(item.weightGrams).toFixed(2)} g`
      : "—";
  return `
  <div class="tag">
    <div class="shop">${safe(item.shopName || "Orivraa")}</div>
    <div class="name">${safe(item.name)}</div>
    <div class="meta">
      <span>${safe(item.purity || "—")}</span>
      <span>${safe(weight)}</span>
    </div>
    <div class="price">${safe(fmtPrice(item.price, item.currency || "NPR"))}</div>
    <div class="barcode">${barcodeSvg(item.sku)}</div>
    <div class="sku">${safe(item.sku)}</div>
    ${item.hallmark ? `<div class="huid">${safe(item.hallmark)}</div>` : ""}
  </div>`;
}

/**
 * Print one or more jewellery tags in a popup window.
 */
export function printJewelleryTags(items: JewelleryTagItem[]): void {
  if (typeof window === "undefined") return;
  if (!items.length) return;

  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) {
    throw new Error("Popup blocked — allow popups to print tags");
  }

  const body = items.map(tagHtml).join("\n");
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Jewellery Tags</title>
  <style>
    @page { margin: 8mm; size: A4; }
    * { box-sizing: border-box; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      margin: 0;
      padding: 12px;
      color: #111;
      background: #fff;
    }
    .sheet {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 10px;
    }
    .tag {
      border: 1px solid #222;
      border-radius: 6px;
      padding: 10px;
      width: 180px;
      min-height: 140px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .shop {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #666;
      margin-bottom: 4px;
    }
    .name {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 6px;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-bottom: 4px;
    }
    .price {
      font-size: 14px;
      font-weight: 800;
      margin: 6px 0;
    }
    .barcode { margin: 4px 0; overflow: hidden; }
    .sku {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      font-weight: 600;
    }
    .huid {
      font-size: 9px;
      color: #555;
      margin-top: 4px;
    }
    @media print {
      body { padding: 0; }
      .tag { border-color: #000; }
    }
  </style>
</head>
<body>
  <div class="sheet">${body}</div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 250);
    };
  </script>
</body>
</html>`);
  win.document.close();
}
