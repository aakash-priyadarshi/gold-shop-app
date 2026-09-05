import { parseOfferEmailDesign } from "./email-design";
import type { OfferEmailBlock, OfferEmailAnimation, OfferEmailTheme } from "./email-design";

export type EmailDesignRenderOptions = {
  unsubscribeUrl: string;
  campaignName: string;
  /** Greeting line, e.g. "Hi Aakash,". Omitted when empty. */
  firstName?: string;
  brandIconUrl: string;
  preheader?: string;
  theme?: OfferEmailTheme;
  /** Editor-only markup is never used by the API delivery wrapper. */
  editor?: boolean;
  selectedBlockId?: string;
  imagesOff?: boolean;
  disableAnimations?: boolean;
};

export type RenderedEmailDesign = {
  html: string;
  bytes: number;
};

const PALETTE = {
  pageBackground: "#f6f1e6",
  cardBorder: "#e6dcc6",
  headerBar: "#0d1830",
  heading: "#13213c",
  body: "#344054",
  muted: "#667085",
  accent: "#8a5b13",
  primaryButton: "#b7791f",
  secondaryButton: "#172033",
  footerText: "#cbd2df",
  footerLink: "#e5c477",
  fineText: "#9a8f79",
  rule: "#ead9b6",
} as const;

type Palette = { [K in keyof typeof PALETTE]: string };

function paletteFor(theme?: OfferEmailTheme): Palette {
  if (theme === "editorial") return { ...PALETTE, pageBackground: "#f1f3f5", headerBar: "#193d35", heading: "#193d35", primaryButton: "#25614e", accent: "#25614e", cardBorder: "#dce4df", rule: "#dce4df" };
  if (theme === "midnight") return { ...PALETTE, pageBackground: "#e8eaf0", headerBar: "#111827", heading: "#111827", primaryButton: "#4f46e5", accent: "#4f46e5", cardBorder: "#dcddea", rule: "#dcddea" };
  return PALETTE;
}

const FONT_SANS = "Arial,Helvetica,sans-serif";
const FONT_SERIF = "Georgia,\'Times New Roman\',serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Minimal inline formatting for text blocks: **bold**, *italic*, and
 * [label](https://url) links. The text is HTML-escaped first, so no raw
 * markup can survive into the email.
 */
function renderRichText(text: string, palette: Palette): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\[([^\]]+)\]\((https:[^)\s]+)\)/g, (_match, label: string, url: string) => {
      return `<a href="${url}" style="color:${palette.primaryButton};text-decoration:underline">${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderParagraphs(text: string, align: "left" | "center", palette: Palette, fontSize = 16): string {
  const alignStyle = align === "center" ? "text-align:center" : "text-align:left";
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;${alignStyle};font-size:${fontSize}px;color:${palette.body}">${renderRichText(block, palette).replace(/\r?\n/g, "<br />")}</p>`,
    )
    .join("");
}

function bulletproofButton(
  label: string,
  url: string,
  variant: "primary" | "secondary",
  palette: Palette,
  block: OfferEmailBlock,
): string {
  const background = block.style?.backgroundColor || (variant === "secondary" ? palette.secondaryButton : palette.primaryButton);
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:4px ${block.style?.align === "center" ? "auto" : "0"}"><tr><td align="center" bgcolor="${background}" style="border-radius:${block.style?.radius ?? 11}px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 22px;border-radius:${block.style?.radius ?? 11}px;background:${background};color:${block.style?.textColor || "#fff"};text-decoration:none;font-weight:700;font-size:${block.style?.fontSize || 15}px">${escapeHtml(label)}</a></td></tr></table>`;
}

function animationClass(animation?: OfferEmailAnimation): string {
  return animation && animation !== "none" ? ` class="orv-anim-${animation}"` : "";
}

function wrapped(animation: OfferEmailAnimation | undefined, inner: string): string {
  if (!animation || animation === "none") return inner;
  return `<div${animationClass(animation)}>${inner}</div>`;
}

/**
 * Renders a validated block design into a standalone, table-based email with
 * inline styles only (plus a progressive-enhancement <style> block holding
 * @keyframes that Gmail/Outlook silently drop — those clients show the static
 * fallback because every animated element is fully visible by default).
 */
export class OfferEmailRenderer {
  render(
    blocks: OfferEmailBlock[],
    options: EmailDesignRenderOptions,
  ): RenderedEmailDesign {
    const design = parseOfferEmailDesign({ blocks, preheader: options.preheader, theme: options.theme });
    blocks = design.blocks;
    const palette = paletteFor(design.theme);
    const animations = new Set<OfferEmailAnimation>();
    for (const block of blocks) {
      if (!options.disableAnimations && "animation" in block && block.animation && block.animation !== "none") {
        animations.add(block.animation);
      }
    }

    const body = blocks.map((block, index) => {
      const staticBlock = options.disableAnimations ? { ...block, animation: undefined } as OfferEmailBlock : block;
      let html = this.renderBlock(staticBlock, palette, options);
      const style = block.style;
      if (style && (style.backgroundColor || style.fontFamily || style.padding || style.radius || style.align)) {
        const background = block.type !== "button" && style.backgroundColor ? `background:${style.backgroundColor};` : "";
        const font = style.fontFamily ? `font-family:${style.fontFamily === "serif" ? FONT_SERIF : FONT_SANS};` : "";
        html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="${background}${font}padding:${style.padding ?? 0}px;border-radius:${style.radius ?? 0}px;text-align:${style.align ?? "left"}">${html}</td></tr></table>`;
      }
      return options.editor
        ? `<div data-email-block="${index}" style="cursor:pointer;outline:${block.id === options.selectedBlockId ? "2px solid #7b61b3" : "none"};outline-offset:3px">${html}</div>`
        : html;
    }).join("");
    const greeting = options.firstName
      ? `<p style="margin:0 0 14px;font-size:16px;color:${palette.body}">Hi ${escapeHtml(options.firstName)},</p>`
      : "";

    const galleryStyles = blocks.some((block) => block.type === "gallery") ? '<style>@media only screen and (max-width:480px){.orv-gallery-cell{display:block!important;width:100%!important;max-width:100%!important;padding:0 0 16px!important}}</style>' : "";
    const styleBlock =
      animations.size > 0
        ? `<style>${[...animations]
            .map((animation) =>
              animation === "fadeIn"
                ? "@keyframes orvFadeIn{from{opacity:0}to{opacity:1}}.orv-anim-fadeIn{animation:orvFadeIn .8s ease-out both}"
                : "@keyframes orvSlideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}.orv-anim-slideUp{animation:orvSlideUp .8s ease-out both}",
            )
            .join("")}</style>`
        : "";

    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(options.campaignName)} from Orivraa</title>
    ${styleBlock}${galleryStyles}
  </head>
  <body style="margin:0;background:${palette.pageBackground};color:${palette.body};font-family:Arial,Helvetica,sans-serif;line-height:1.6">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(options.preheader ?? options.campaignName)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center" style="padding:28px 14px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#fff;border:1px solid ${palette.cardBorder};border-radius:20px;overflow:hidden">
            <tr>
              <td style="background:${palette.headerBar};padding:20px 28px;color:#fff">
                ${options.imagesOff ? "" : `<img src="${escapeHtml(options.brandIconUrl)}" width="42" height="42" alt="Orivraa" style="vertical-align:middle;border-radius:10px" />`}
                <strong style="margin-left:10px;font-size:22px">Orivraa</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:32px">
                <div style="color:${palette.accent};font-size:12px;font-weight:700;text-transform:uppercase">${escapeHtml(options.campaignName)}</div>
                ${greeting}
                ${body}
              </td>
            </tr>
            <tr>
              <td style="background:${palette.headerBar};padding:22px 30px;text-align:center;color:${palette.footerText};font-size:12px">
                Need help? Reply to this email. You received this because you created an Orivraa shop account.
                <br />
                <a href="${escapeHtml(options.unsubscribeUrl)}" style="color:${palette.footerLink};text-decoration:underline">Unsubscribe from future offers</a>.
              </td>
            </tr>
          </table>
          <p style="color:${palette.fineText};font-size:11px">© ${new Date().getFullYear()} Orivraa. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    return { html, bytes: new TextEncoder().encode(html).byteLength };
  }

  private renderBlock(block: OfferEmailBlock, basePalette: Palette, options: EmailDesignRenderOptions): string {
    const palette = { ...basePalette, body: block.style?.textColor ?? basePalette.body, heading: block.style?.textColor ?? basePalette.heading };
    const image = (url: string, alt: string, width = 640) => options.imagesOff
      ? `<div role="img" aria-label="${escapeHtml(alt)}" style="padding:28px 16px;border:1px dashed ${palette.cardBorder};color:${palette.muted};text-align:center">${escapeHtml(alt)}</div>`
      : `<img src="${escapeHtml(url)}" width="${width}" alt="${escapeHtml(alt)}" style="display:block;width:100%;height:auto;border:0;border-radius:${block.style?.radius ?? 12}px" />`;
    switch (block.type) {
      case "heading":
        return wrapped(
          block.animation,
          `<h2 style="margin:8px 0 18px;color:${palette.heading};font-family:${block.style?.fontFamily === "sans" ? FONT_SANS : FONT_SERIF};font-size:${block.style?.fontSize ?? 26}px;line-height:1.3">${escapeHtml(block.text)}</h2>`,
        );
      case "text":
        return wrapped(
          block.animation,
          renderParagraphs(block.text, block.style?.align ?? (block.align === "center" ? "center" : "left"), palette, block.style?.fontSize),
        );
      case "image": {
        const renderedImage = image(block.url, block.alt);
        const linked = block.linkUrl
          ? `<a href="${escapeHtml(block.linkUrl)}" style="display:block;text-decoration:none">${renderedImage}</a>`
          : renderedImage;
        return wrapped(
          block.animation,
          `<div style="margin:8px 0 18px">${linked}</div>`,
        );
      }
      case "video": {
        // Email clients do not run video inline (Apple Mail excepted), so the
        // block renders as a linked poster with a clear play CTA — the same
        // "fake video" pattern used by major senders.
        const poster = image(block.posterUrl, block.label || "Watch the product demo");
        return wrapped(
          block.animation,
          `<div style="margin:8px 0 18px"><a href="${escapeHtml(block.videoUrl)}" style="display:block;text-decoration:none">${poster}</a><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:12px auto 0"><tr><td align="center" bgcolor="${palette.primaryButton}" style="border-radius:11px"><a href="${escapeHtml(block.videoUrl)}" style="display:inline-block;padding:14px 22px;border-radius:11px;background:${palette.primaryButton};color:#fff;text-decoration:none;font-weight:700;font-size:15px">&#9654; ${escapeHtml(block.label || "Watch the demo")}</a></td></tr></table></div>`,
        );
      }
      case "button":
        return `<div style="margin:10px 0 18px">${bulletproofButton(
          block.label,
          block.url,
          block.variant === "secondary" ? "secondary" : "primary",
          palette,
          block,
        )}</div>`;
      case "gallery": {
        const width = Math.floor(100 / block.images.length);
        const cells = block.images.map((entry) => {
          let visual = image(entry.url, entry.alt, Math.floor(548 / block.images.length) - 12);
          if (entry.linkUrl) visual = `<a href="${escapeHtml(entry.linkUrl)}">${visual}</a>`;
          return `<td class="orv-gallery-cell" width="${width}%" valign="top" style="padding:0 6px;width:${width}%;vertical-align:top">${visual}${entry.caption ? `<p style="font-size:${block.style?.fontSize ?? 14}px;color:${palette.body};margin:10px 0;text-align:${block.style?.align ?? "left"}">${escapeHtml(entry.caption)}</p>` : ""}</td>`;
        }).join("");
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;margin:8px 0 18px"><tr>${cells}</tr></table>`;
      }
      case "divider":
        return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:14px 0 18px"><tr><td style="border-top:1px solid ${palette.rule};font-size:0;line-height:0">&nbsp;</td></tr></table>`;
      case "spacer": {
        const size = block.size && block.size >= 8 && block.size <= 120 ? block.size : 24;
        return `<div style="height:${size}px;line-height:${size}px;font-size:0">&nbsp;</div>`;
      }
      default:
        return "";
    }
  }
}
