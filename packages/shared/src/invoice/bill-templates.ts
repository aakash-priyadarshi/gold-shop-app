/**
 * Seller-selectable invoice / bill layouts.
 * IDs are stored on InvoiceSettings.billTemplateId and used by
 * PDF generation, browser print, and the settings live preview.
 */

export const BILL_TEMPLATE_IDS = [
  "classic",
  "royal",
  "compact",
  "ornate",
  "minimal",
] as const;

export type BillTemplateId = (typeof BILL_TEMPLATE_IDS)[number];

export const DEFAULT_BILL_TEMPLATE_ID: BillTemplateId = "classic";

export type BillTemplateTheme = {
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  headerBg: string;
  headerInk: string;
  border: string;
  totalBorder: string;
  shopNameSize: string;
  density: "comfortable" | "compact";
  style: BillTemplateId;
};

export type BillTemplateMeta = {
  id: BillTemplateId;
  label: string;
  description: string;
  theme: BillTemplateTheme;
};

export const BILL_TEMPLATES: BillTemplateMeta[] = [
  {
    id: "classic",
    label: "Classic",
    description: "Warm gold headings — the traditional jewellery bill",
    theme: {
      paper: "#ffffff",
      ink: "#111111",
      muted: "#6b7280",
      accent: "#b45309",
      headerBg: "#ffffff",
      headerInk: "#b45309",
      border: "#e5e7eb",
      totalBorder: "#1f2937",
      shopNameSize: "18px",
      density: "comfortable",
      style: "classic",
    },
  },
  {
    id: "royal",
    label: "Royal",
    description: "Navy header with gold accents — formal and ceremonial",
    theme: {
      paper: "#fffdf8",
      ink: "#0f172a",
      muted: "#475569",
      accent: "#c9a227",
      headerBg: "#1e3a5f",
      headerInk: "#f8fafc",
      border: "#d6c48a",
      totalBorder: "#1e3a5f",
      shopNameSize: "18px",
      density: "comfortable",
      style: "royal",
    },
  },
  {
    id: "compact",
    label: "Compact",
    description: "Tighter spacing so more of the bill fits on one page",
    theme: {
      paper: "#ffffff",
      ink: "#111111",
      muted: "#525252",
      accent: "#92400e",
      headerBg: "#ffffff",
      headerInk: "#92400e",
      border: "#e5e7eb",
      totalBorder: "#171717",
      shopNameSize: "15px",
      density: "compact",
      style: "compact",
    },
  },
  {
    id: "ornate",
    label: "Ornate",
    description: "Double gold border — wedding and festive invoices",
    theme: {
      paper: "#fffbeb",
      ink: "#1c1917",
      muted: "#78716c",
      accent: "#b45309",
      headerBg: "#fffbeb",
      headerInk: "#92400e",
      border: "#b45309",
      totalBorder: "#92400e",
      shopNameSize: "20px",
      density: "comfortable",
      style: "ornate",
    },
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Clean black and white — modern boutique look",
    theme: {
      paper: "#ffffff",
      ink: "#171717",
      muted: "#737373",
      accent: "#171717",
      headerBg: "#ffffff",
      headerInk: "#171717",
      border: "#e5e7eb",
      totalBorder: "#171717",
      shopNameSize: "16px",
      density: "comfortable",
      style: "minimal",
    },
  },
];

export function isBillTemplateId(value: unknown): value is BillTemplateId {
  return (
    typeof value === "string" &&
    (BILL_TEMPLATE_IDS as readonly string[]).includes(value)
  );
}

export function resolveBillTemplateId(
  id?: string | null,
): BillTemplateId {
  const normalised = (id || "").trim().toLowerCase();
  return isBillTemplateId(normalised)
    ? normalised
    : DEFAULT_BILL_TEMPLATE_ID;
}

export function getBillTemplate(id?: string | null): BillTemplateMeta {
  const resolved = resolveBillTemplateId(id);
  return BILL_TEMPLATES.find((t) => t.id === resolved) || BILL_TEMPLATES[0];
}

/** Extra CSS injected into the browser print HTML for the chosen template. */
export function billTemplatePrintCss(id?: string | null): string {
  const { id: tid, theme: th } = getBillTemplate(id);
  const compact = th.density === "compact";
  const ornate = tid === "ornate";
  const royal = tid === "royal";
  return `
body.bill-tpl-${tid}{background:${th.paper};color:${th.ink};padding:${compact ? "16px 14px" : "28px 24px"};${ornate ? `outline:2px solid ${th.border};outline-offset:-10px;border:1px solid ${th.border};` : ""}}
body.bill-tpl-${tid} h2{color:${th.headerInk};font-size:${th.shopNameSize}${royal ? ";letter-spacing:.04em" : ""}${tid === "minimal" ? ";font-weight:600;letter-spacing:.12em;text-transform:uppercase" : ""}}
body.bill-tpl-${tid} h1.doc-title{color:${royal ? th.accent : th.ink};font-size:${compact ? "18px" : "24px"}}
body.bill-tpl-${tid} .muted,.bill-tpl-${tid} .tiny,.bill-tpl-${tid} .footer{color:${th.muted}}
body.bill-tpl-${tid} .divider{border-top-color:${th.border}}
body.bill-tpl-${tid} .total-row{border-top-color:${th.totalBorder}}
body.bill-tpl-${tid} .amt-due{color:${th.accent}}
body.bill-tpl-${tid} .row{padding:${compact ? "3px 0" : "5px 0"};font-size:${compact ? "12px" : "13px"}}
${royal ? `body.bill-tpl-royal .brand-top{background:${th.headerBg};color:${th.headerInk};padding:14px 16px;margin:-8px -8px 14px;border-radius:4px}body.bill-tpl-royal .brand-top h2{color:${th.headerInk}}body.bill-tpl-royal .brand-top .muted{color:#cbd5e1}` : ""}
`.trim();
}
