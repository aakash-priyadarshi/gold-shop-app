/** Shared QR, barcode and multi-layout jewellery tag printing. */
import { toQrDataUrl } from "@/lib/qrCode";

export interface JewelleryTagItem {
  id?: string | null;
  sku: string;
  name: string;
  purity?: string | null;
  weightGrams?: number | null;
  price?: number | null;
  currency?: string | null;
  hallmark?: string | null;
  rfidCode?: string | null;
  shopName?: string | null;
}

export type TagLayoutId = "A4_3X7" | "A4_2X5" | "THERMAL_50X25" | "THERMAL_60X40";

export interface TagLayout {
  id: TagLayoutId;
  label: string;
  description: string;
  widthMm: number;
  heightMm: number;
  columns: number;
  page: "A4" | "continuous";
}

export const TAG_LAYOUTS: TagLayout[] = [
  { id: "A4_3X7", label: "A4 — 21 tags", description: "3 columns × 7 rows (63 × 38 mm)", widthMm: 63, heightMm: 38, columns: 3, page: "A4" },
  { id: "A4_2X5", label: "A4 — 10 large tags", description: "2 columns × 5 rows (95 × 54 mm)", widthMm: 95, heightMm: 54, columns: 2, page: "A4" },
  { id: "THERMAL_50X25", label: "Thermal — 50 × 25 mm", description: "One tag per continuous-roll label", widthMm: 50, heightMm: 25, columns: 1, page: "continuous" },
  { id: "THERMAL_60X40", label: "Thermal — 60 × 40 mm", description: "One large tag per continuous-roll label", widthMm: 60, heightMm: 40, columns: 1, page: "continuous" },
];

export interface TagPrintOptions {
  layoutId?: TagLayoutId;
  copies?: number;
  includeQr?: boolean;
  includeBarcode?: boolean;
  includeRfid?: boolean;
}

const CODE39: Record<string, string> = {
  "0":"nnnwwnwnn","1":"wnnwnnnnw","2":"nnwwnnnnw","3":"wnwwnnnnn","4":"nnnwwnnnw","5":"wnnwwnnnn","6":"nnwwwnnnn","7":"nnnwnnwnw","8":"wnnwnnwnn","9":"nnwwnnwnn",
  A:"wnnnnwnnw",B:"nnwnnwnnw",C:"wnwnnwnnn",D:"nnnnwwnnw",E:"wnnnwwnnn",F:"nnwnwwnnn",G:"nnnnnwwnw",H:"wnnnnwwnn",I:"nnwnnwwnn",J:"nnnnwwwnn",
  K:"wnnnnnnww",L:"nnwnnnnww",M:"wnwnnnnwn",N:"nnnnwnnww",O:"wnnnwnnwn",P:"nnwnwnnwn",Q:"nnnnnnwww",R:"wnnnnnwwn",S:"nnwnnnwwn",T:"nnnnwnwwn",
  U:"wwnnnnnnw",V:"nwwnnnnnw",W:"wwwnnnnnn",X:"nwnnwnnnw",Y:"wwnnwnnnn",Z:"nwwnwnnnn","-":"nwnnnnwnw",".":"wwnnnnwnn"," ":"nwwnnnwnn","$":"nwnwnwnnn","/":"nwnwnnnwn","+":"nwnnnwnwn","%":"nnnwnwnwn","*":"nwnnwnwnn",
};

function safe(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function price(amount: number | null | undefined, currency = "NPR"): string {
  return amount == null || Number.isNaN(Number(amount)) ? "—" : `${currency} ${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** QR uses immutable inventory id; old calls without it still encode a scannable SKU. */
export function getTagQrPayload(item: Pick<JewelleryTagItem, "id" | "sku">): string {
  return item.id ? `orivraa:inventory:${item.id}` : item.sku;
}

/** A valid Code 39 SVG, suitable for normal barcode scanners. */
export function buildCode39Svg(value: string): string {
  const text = (String(value || "").toUpperCase().replace(/[^0-9A-Z .\-$\/+%]/g, "-").slice(0, 32) || "-");
  let x = 10;
  const bars: string[] = [];
  for (const char of `*${text}*`) {
    const pattern = CODE39[char] ?? CODE39["-"];
    for (let index = 0; index < pattern.length; index += 1) {
      const width = pattern[index] === "w" ? 3 : 1;
      if (index % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${width}" height="36" fill="#000"/>`);
      x += width;
    }
    x += 1;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x + 10} 36" preserveAspectRatio="none">${bars.join("")}</svg>`;
}

function layoutFor(id?: TagLayoutId): TagLayout {
  return TAG_LAYOUTS.find((layout) => layout.id === id) ?? TAG_LAYOUTS[0];
}

async function renderTag(item: JewelleryTagItem, layout: TagLayout, options: Required<Pick<TagPrintOptions, "includeQr" | "includeBarcode" | "includeRfid">>): Promise<string> {
  const qr = options.includeQr ? await toQrDataUrl(getTagQrPayload(item), 180) : "";
  const compact = layout.heightMm <= 25 ? " compact" : "";
  const weight = item.weightGrams == null ? "—" : `${Number(item.weightGrams).toFixed(2)} g`;
  return `<article class="tag${compact}"><div class="details"><div class="shop">${safe(item.shopName || "Orivraa")}</div><div class="name">${safe(item.name)}</div><div class="meta"><span>${safe(item.purity || "—")}</span><span>${safe(weight)}</span></div><div class="price">${safe(price(item.price, item.currency || "NPR"))}</div><div class="sku">${safe(item.sku)}</div>${item.hallmark ? `<div class="minor">HUID ${safe(item.hallmark)}</div>` : ""}${options.includeRfid && item.rfidCode ? `<div class="minor">RFID ${safe(item.rfidCode)}</div>` : ""}</div><div class="codes">${qr ? `<img class="qr" src="${qr}" alt="Inventory QR code"/>` : ""}${options.includeBarcode ? `<div class="barcode">${buildCode39Svg(item.sku)}</div>` : ""}</div></article>`;
}

/** Opens the popup synchronously (avoids popup blockers) and prints a chosen layout. */
export async function printJewelleryTags(items: JewelleryTagItem[], options: TagPrintOptions = {}): Promise<void> {
  if (typeof window === "undefined" || items.length === 0) return;
  const win = window.open("", "_blank", "width=900,height=900");
  if (!win) throw new Error("Popup blocked — allow popups to print tags");
  const layout = layoutFor(options.layoutId);
  const copies = Math.min(Math.max(Math.floor(options.copies ?? 1), 1), 50);
  const list = items.flatMap((item) => Array.from({ length: copies }, () => item));
  const codeOptions = { includeQr: options.includeQr ?? true, includeBarcode: options.includeBarcode ?? true, includeRfid: options.includeRfid ?? true };
  const tags = (await Promise.all(list.map((item) => renderTag(item, layout, codeOptions)))).join("");
  const a4 = layout.page === "A4";
  const page = a4 ? "@page{size:A4;margin:7mm}" : `@page{size:${layout.widthMm}mm ${layout.heightMm}mm;margin:0}`;
  win.document.write(`<!doctype html><html><head><title>Jewellery tags</title><style>${page}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,sans-serif;color:#111}.sheet{display:grid;grid-template-columns:repeat(${layout.columns},${layout.widthMm}mm);grid-auto-rows:${layout.heightMm}mm;gap:${a4 ? "1.5mm" : "0"};${a4 ? "padding:7mm" : ""}}.tag{width:${layout.widthMm}mm;height:${layout.heightMm}mm;border:.2mm solid #111;padding:2mm;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) 18mm;gap:1.2mm;break-inside:avoid}.shop{font-size:6.5pt;text-transform:uppercase;letter-spacing:.08em;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.name{font-size:9pt;font-weight:700;line-height:1.1;margin-top:.8mm;max-height:20pt;overflow:hidden}.meta{display:flex;justify-content:space-between;font-size:7pt;margin-top:1mm}.price{font-size:10pt;font-weight:800;margin-top:1mm}.sku{font:700 7pt monospace;margin-top:.8mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.minor{font-size:5.8pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#444}.codes{display:flex;flex-direction:column;justify-content:space-between;gap:1mm}.qr{width:18mm;height:18mm;image-rendering:pixelated}.barcode{height:8mm;width:100%}.barcode svg{width:100%;height:100%;display:block}.compact{padding:1.2mm;grid-template-columns:minmax(0,1fr) 13mm}.compact .shop{font-size:4.8pt}.compact .name{font-size:6.5pt;margin-top:.3mm}.compact .meta,.compact .sku{font-size:5.2pt;margin-top:.3mm}.compact .price{font-size:7pt;margin-top:.3mm}.compact .minor{font-size:4.4pt}.compact .qr{width:13mm;height:13mm}.compact .barcode{height:5.5mm}@media print{.sheet{${a4 ? "padding:0" : ""}}}</style></head><body><main class="sheet">${tags}</main><script>window.onload=()=>setTimeout(()=>window.print(),150)</script></body></html>`);
  win.document.close();
}

/** Uses raw label printing when configured, otherwise the selected browser layout. */
export async function printStockJewelleryTags(items: JewelleryTagItem[], options: TagPrintOptions = {}): Promise<"label" | "browser"> {
  if (items.length === 0) return "browser";
  const { loadHardwareConfig, printJewelleryLabel } = await import("@/lib/posHardware");
  const cfg = loadHardwareConfig().labelPrinter;
  if (cfg.enabled) {
    const copies = Math.min(Math.max(Math.floor(options.copies ?? 1), 1), 50);
    for (const item of items) for (let copy = 0; copy < copies; copy += 1) await printJewelleryLabel({ id: item.id || undefined, sku: item.sku, name: item.name, purity: item.purity || undefined, weightGrams: item.weightGrams ?? undefined, price: item.price ?? undefined, currency: item.currency || undefined, hallmark: item.hallmark || undefined, rfidCode: item.rfidCode || undefined, shopName: item.shopName || undefined });
    return "label";
  }
  await printJewelleryTags(items, options);
  return "browser";
}
