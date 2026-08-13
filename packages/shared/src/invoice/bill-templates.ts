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

/** Metallic gold for borders and auspicious icons. */
export const BILL_ORNAMENT_GOLD = "#c9a227";
/** Wine — used when the paper is already cream/gold so gold would disappear. */
export const BILL_ORNAMENT_WINE = "#6b2d3c";

export type BillOrnamentIcon = "diya" | "crown" | "diamond" | "lotus" | "kalash";
export type BillFrameStyle = "double" | "solid" | "dashed" | "corners";

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
  ornamentColor: string;
  ornamentIcon: BillOrnamentIcon;
  frame: BillFrameStyle;
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
    description: "Double gold frame with a diya on the top and bottom border",
    theme: {
      paper: "#ffffff",
      ink: "#111111",
      muted: "#6b7280",
      accent: "#b45309",
      headerBg: "#ffffff",
      headerInk: "#b45309",
      border: BILL_ORNAMENT_GOLD,
      totalBorder: "#1f2937",
      shopNameSize: "18px",
      density: "comfortable",
      style: "classic",
      ornamentColor: BILL_ORNAMENT_GOLD,
      ornamentIcon: "diya",
      frame: "double",
    },
  },
  {
    id: "royal",
    label: "Royal",
    description: "Navy header, gold crown on a solid ceremonial frame",
    theme: {
      paper: "#fffdf8",
      ink: "#0f172a",
      muted: "#475569",
      accent: BILL_ORNAMENT_GOLD,
      headerBg: "#1e3a5f",
      headerInk: "#f8fafc",
      border: BILL_ORNAMENT_GOLD,
      totalBorder: "#1e3a5f",
      shopNameSize: "18px",
      density: "comfortable",
      style: "royal",
      ornamentColor: BILL_ORNAMENT_GOLD,
      ornamentIcon: "crown",
      frame: "solid",
    },
  },
  {
    id: "compact",
    label: "Compact",
    description: "Dashed gold border with a gem — tighter spacing for one page",
    theme: {
      paper: "#ffffff",
      ink: "#111111",
      muted: "#525252",
      accent: "#92400e",
      headerBg: "#ffffff",
      headerInk: "#92400e",
      border: BILL_ORNAMENT_GOLD,
      totalBorder: "#171717",
      shopNameSize: "15px",
      density: "compact",
      style: "compact",
      ornamentColor: BILL_ORNAMENT_GOLD,
      ornamentIcon: "diamond",
      frame: "dashed",
    },
  },
  {
    id: "ornate",
    label: "Ornate",
    description: "Cream festive bill with a wine lotus frame (not gold-on-gold)",
    theme: {
      paper: "#fffbeb",
      ink: "#1c1917",
      muted: "#78716c",
      accent: "#92400e",
      headerBg: "#fffbeb",
      headerInk: "#92400e",
      border: BILL_ORNAMENT_WINE,
      totalBorder: "#6b2d3c",
      shopNameSize: "20px",
      density: "comfortable",
      style: "ornate",
      ornamentColor: BILL_ORNAMENT_WINE,
      ornamentIcon: "lotus",
      frame: "double",
    },
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Gold corner ticks and a kalash — clean boutique bill",
    theme: {
      paper: "#ffffff",
      ink: "#171717",
      muted: "#737373",
      accent: "#171717",
      headerBg: "#ffffff",
      headerInk: "#171717",
      border: BILL_ORNAMENT_GOLD,
      totalBorder: "#171717",
      shopNameSize: "16px",
      density: "comfortable",
      style: "minimal",
      ornamentColor: BILL_ORNAMENT_GOLD,
      ornamentIcon: "kalash",
      frame: "corners",
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

function svgWrap(body: string, color: string, size: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 28" width="${size}" height="${Math.round((size * 28) / 32)}" aria-hidden="true" focusable="false">${body.replace(/currentColor/g, color)}</svg>`;
}

const ORNAMENT_PATHS: Record<BillOrnamentIcon, string> = {
  diya: `<path fill="currentColor" d="M16 1.6c-1.4 3.6 2.6 5.8.2 9.2C13.2 8 12.4 4.6 16 1.6z"/><path fill="currentColor" d="M16 10.2c1.8 0 2.6 2.4.2 3.8-.8.5-1.8.5-2.6 0-2.2-1.4-1.4-3.8.2-3.8.7 0 1.4.4 2.2.4z"/><ellipse cx="16" cy="18.2" rx="11.2" ry="3.1" fill="currentColor"/><path fill="currentColor" d="M5.2 18.2c.9 4.4 5.2 7.4 10.8 7.4s9.9-3 10.8-7.4c-2.3 1.9-6.2 3-10.8 3S7.5 20.1 5.2 18.2z"/>`,
  crown: `<path fill="currentColor" d="M4.5 22.5V10.8l5.8 5.2L16 4.8l5.7 11.2 5.8-5.2v11.7H4.5z"/><rect x="4.5" y="21.4" width="23" height="3.2" rx="0.6" fill="currentColor"/>`,
  diamond: `<path fill="currentColor" d="M16 3.2 27 12.4 16 25.6 5 12.4 16 3.2z"/><path fill="#fff" fill-opacity=".22" d="M16 3.2 21.6 12.4 16 25.6V3.2z"/>`,
  lotus: `<ellipse cx="16" cy="16" rx="4.2" ry="9.5" fill="currentColor"/><ellipse cx="10.2" cy="16.5" rx="4" ry="8" fill="currentColor" transform="rotate(-32 10.2 16.5)"/><ellipse cx="21.8" cy="16.5" rx="4" ry="8" fill="currentColor" transform="rotate(32 21.8 16.5)"/>`,
  kalash: `<path fill="currentColor" d="M16 2.4c-2.4 2.2-3.6 4.2-2.2 5.4h4.4c1.4-1.2.2-3.2-2.2-5.4z"/><path fill="currentColor" d="M12.6 8.4h6.8l-.8 2.2h-5.2z"/><ellipse cx="16" cy="18.6" rx="7.2" ry="7.4" fill="currentColor"/><rect x="13.4" y="10.2" width="5.2" height="2.4" rx="0.4" fill="currentColor"/>`,
};

export function billOrnamentSvg(
  icon: BillOrnamentIcon,
  color: string,
  size = 26,
): string {
  return svgWrap(ORNAMENT_PATHS[icon] || ORNAMENT_PATHS.diya, color, size);
}

export function billTemplateFrameCssVars(theme: BillTemplateTheme): {
  borderCss: string;
  padding: string;
} {
  const c = theme.ornamentColor;
  const pad = theme.density === "compact" ? "18px 14px 22px" : "24px 18px 28px";
  switch (theme.frame) {
    case "double":
      return { borderCss: `3px double ${c}`, padding: pad };
    case "dashed":
      return { borderCss: `1.5px dashed ${c}`, padding: pad };
    case "corners":
      return { borderCss: `1px solid transparent`, padding: pad };
    default:
      return { borderCss: `2px solid ${c}`, padding: pad };
  }
}

/** Inline styles for the live preview and template thumbs. */
export function billTemplateFrameStyle(
  theme: BillTemplateTheme,
): Record<string, string> {
  const { borderCss, padding } = billTemplateFrameCssVars(theme);
  const style: Record<string, string> = {
    backgroundColor: theme.paper,
    border: borderCss,
    padding,
    position: "relative",
  };
  if (theme.frame === "corners") {
    const c = theme.ornamentColor;
    style.backgroundImage = [
      `linear-gradient(${c},${c})`,
      `linear-gradient(${c},${c})`,
      `linear-gradient(${c},${c})`,
      `linear-gradient(${c},${c})`,
      `linear-gradient(${c},${c})`,
      `linear-gradient(${c},${c})`,
      `linear-gradient(${c},${c})`,
      `linear-gradient(${c},${c})`,
    ].join(",");
    style.backgroundRepeat = "no-repeat";
    style.backgroundSize =
      "20px 2px,2px 20px,20px 2px,2px 20px,20px 2px,2px 20px,20px 2px,2px 20px";
    style.backgroundPosition =
      "top left,top left,top right,top right,bottom left,bottom left,bottom right,bottom right";
  }
  return style;
}

/** Extra CSS injected into the browser print HTML for the chosen template. */
export function billTemplatePrintCss(id?: string | null): string {
  const { id: tid, theme: th } = getBillTemplate(id);
  const compact = th.density === "compact";
  const royal = tid === "royal";
  const { borderCss } = billTemplateFrameCssVars(th);
  const c = th.ornamentColor;
  const corner =
    th.frame === "corners"
      ? `body.bill-tpl-${tid} .bill-frame{border-color:transparent;background-image:linear-gradient(${c},${c}),linear-gradient(${c},${c}),linear-gradient(${c},${c}),linear-gradient(${c},${c}),linear-gradient(${c},${c}),linear-gradient(${c},${c}),linear-gradient(${c},${c}),linear-gradient(${c},${c});background-repeat:no-repeat;background-size:20px 2px,2px 20px,20px 2px,2px 20px,20px 2px,2px 20px,20px 2px,2px 20px;background-position:top left,top left,top right,top right,bottom left,bottom left,bottom right,bottom right}body.bill-tpl-${tid} .bill-frame::before,body.bill-tpl-${tid} .bill-frame::after{content:'';position:absolute;left:28px;right:28px;height:1.5px;background:${c}}body.bill-tpl-${tid} .bill-frame::before{top:0}body.bill-tpl-${tid} .bill-frame::after{bottom:0}`
      : "";
  return `
body.bill-tpl-${tid}{background:${th.paper};color:${th.ink};padding:${compact ? "18px 14px" : "28px 22px"}}
body.bill-tpl-${tid} .bill-frame{position:relative;border:${borderCss};padding:${compact ? "18px 12px 22px" : "22px 16px 26px"};margin-top:10px}
body.bill-tpl-${tid} .bill-ornament{position:absolute;left:50%;transform:translateX(-50%);background:${th.paper};padding:0 8px;line-height:0;z-index:2}
body.bill-tpl-${tid} .bill-ornament-top{top:-12px}
body.bill-tpl-${tid} .bill-ornament-bottom{bottom:-12px}
${corner}
body.bill-tpl-${tid} h2{color:${th.headerInk};font-size:${th.shopNameSize}${royal ? ";letter-spacing:.04em" : ""}${tid === "minimal" ? ";font-weight:600;letter-spacing:.12em;text-transform:uppercase" : ""}}
body.bill-tpl-${tid} h1.doc-title{color:${royal ? th.accent : th.ink};font-size:${compact ? "18px" : "24px"}}
body.bill-tpl-${tid} .muted,.bill-tpl-${tid} .tiny,.bill-tpl-${tid} .footer{color:${th.muted}}
body.bill-tpl-${tid} .divider{border-top-color:${th.border}}
body.bill-tpl-${tid} .total-row{border-top-color:${th.totalBorder}}
body.bill-tpl-${tid} .amt-due{color:${th.accent}}
body.bill-tpl-${tid} .row{padding:${compact ? "3px 0" : "5px 0"};font-size:${compact ? "12px" : "13px"}}
${royal ? `body.bill-tpl-royal .brand-top{background:${th.headerBg};color:${th.headerInk};padding:14px 16px;margin:0 0 14px;border-radius:4px}body.bill-tpl-royal .brand-top h2{color:${th.headerInk}}body.bill-tpl-royal .brand-top .muted{color:#cbd5e1}` : ""}
`.trim();
}

export function billTemplateOrnamentHtml(id?: string | null): {
  top: string;
  bottom: string;
} {
  const t = getBillTemplate(id);
  const svg = billOrnamentSvg(t.theme.ornamentIcon, t.theme.ornamentColor, 26);
  return {
    top: `<div class="bill-ornament bill-ornament-top">${svg}</div>`,
    bottom: `<div class="bill-ornament bill-ornament-bottom">${svg}</div>`,
  };
}
