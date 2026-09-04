import { Injectable } from "@nestjs/common";
import type { OfferEmailBlock, OfferEmailAnimation } from "./email-design";

export type EmailDesignRenderOptions = {
  unsubscribeUrl: string;
  campaignName: string;
  /** Greeting line, e.g. "Hi Aakash,". Omitted when empty. */
  firstName?: string;
  brandIconUrl: string;
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
function renderRichText(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\[([^\]]+)\]\((https:[^)\s]+)\)/g, (_match, label: string, url: string) => {
      return `<a href="${url}" style="color:${PALETTE.primaryButton};text-decoration:underline">${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderParagraphs(text: string, align: "left" | "center"): string {
  const alignStyle = align === "center" ? "text-align:center" : "text-align:left";
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;${alignStyle};font-size:16px;color:${PALETTE.body}">${renderRichText(block).replace(/\r?\n/g, "<br />")}</p>`,
    )
    .join("");
}

function bulletproofButton(
  label: string,
  url: string,
  variant: "primary" | "secondary",
): string {
  const background =
    variant === "secondary" ? PALETTE.secondaryButton : PALETTE.primaryButton;
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0"><tr><td align="center" bgcolor="${background}" style="border-radius:11px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 22px;border-radius:11px;background:${background};color:#fff;text-decoration:none;font-weight:700;font-size:15px">${escapeHtml(label)}</a></td></tr></table>`;
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
@Injectable()
export class EmailDesignRendererService {
  render(
    blocks: OfferEmailBlock[],
    options: EmailDesignRenderOptions,
  ): RenderedEmailDesign {
    const animations = new Set<OfferEmailAnimation>();
    for (const block of blocks) {
      if ("animation" in block && block.animation && block.animation !== "none") {
        animations.add(block.animation);
      }
    }

    const body = blocks.map((block) => this.renderBlock(block)).join("");
    const greeting = options.firstName
      ? `<p style="margin:0 0 14px;font-size:16px;color:${PALETTE.body}">Hi ${escapeHtml(options.firstName)},</p>`
      : "";

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
    ${styleBlock}
  </head>
  <body style="margin:0;background:${PALETTE.pageBackground};color:${PALETTE.body};font-family:Arial,Helvetica,sans-serif;line-height:1.6">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(options.campaignName)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center" style="padding:28px 14px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#fff;border:1px solid ${PALETTE.cardBorder};border-radius:20px;overflow:hidden">
            <tr>
              <td style="background:${PALETTE.headerBar};padding:20px 28px;color:#fff">
                <img src="${escapeHtml(options.brandIconUrl)}" width="42" height="42" alt="Orivraa" style="vertical-align:middle;border-radius:10px" />
                <strong style="margin-left:10px;font-size:22px">Orivraa</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:32px">
                <div style="color:${PALETTE.accent};font-size:12px;font-weight:700;text-transform:uppercase">${escapeHtml(options.campaignName)}</div>
                ${greeting}
                ${body}
              </td>
            </tr>
            <tr>
              <td style="background:${PALETTE.headerBar};padding:22px 30px;text-align:center;color:${PALETTE.footerText};font-size:12px">
                Need help? Reply to this email. You received this because you created an Orivraa shop account.
                <br />
                <a href="${escapeHtml(options.unsubscribeUrl)}" style="color:${PALETTE.footerLink};text-decoration:underline">Unsubscribe from future offers</a>.
              </td>
            </tr>
          </table>
          <p style="color:${PALETTE.fineText};font-size:11px">© ${new Date().getFullYear()} Orivraa. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    return { html, bytes: Buffer.byteLength(html, "utf8") };
  }

  private renderBlock(block: OfferEmailBlock): string {
    switch (block.type) {
      case "heading":
        return wrapped(
          block.animation,
          `<h2 style="margin:8px 0 18px;color:${PALETTE.heading};font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.3">${escapeHtml(block.text)}</h2>`,
        );
      case "text":
        return wrapped(
          block.animation,
          renderParagraphs(block.text, block.align === "center" ? "center" : "left"),
        );
      case "image": {
        const image = `<img src="${escapeHtml(block.url)}" width="640" alt="${escapeHtml(block.alt)}" style="display:block;width:100%;height:auto;border:0;border-radius:12px" />`;
        const linked = block.linkUrl
          ? `<a href="${escapeHtml(block.linkUrl)}" style="display:block;text-decoration:none">${image}</a>`
          : image;
        return wrapped(
          block.animation,
          `<div style="margin:8px 0 18px">${linked}</div>`,
        );
      }
      case "video": {
        // Email clients do not run video inline (Apple Mail excepted), so the
        // block renders as a linked poster with a clear play CTA — the same
        // "fake video" pattern used by major senders.
        const poster = `<img src="${escapeHtml(block.posterUrl)}" width="640" alt="${escapeHtml(block.label || "Watch the product demo")}" style="display:block;width:100%;height:auto;border:0;border-radius:12px" />`;
        return wrapped(
          block.animation,
          `<div style="margin:8px 0 18px"><a href="${escapeHtml(block.videoUrl)}" style="display:block;text-decoration:none">${poster}</a><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:12px auto 0"><tr><td align="center" bgcolor="${PALETTE.primaryButton}" style="border-radius:11px"><a href="${escapeHtml(block.videoUrl)}" style="display:inline-block;padding:14px 22px;border-radius:11px;background:${PALETTE.primaryButton};color:#fff;text-decoration:none;font-weight:700;font-size:15px">&#9654; ${escapeHtml(block.label || "Watch the demo")}</a></td></tr></table></div>`,
        );
      }
      case "button":
        return `<div style="margin:10px 0 18px">${bulletproofButton(
          block.label,
          block.url,
          block.variant === "secondary" ? "secondary" : "primary",
        )}</div>`;
      case "divider":
        return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:14px 0 18px"><tr><td style="border-top:1px solid ${PALETTE.rule};font-size:0;line-height:0">&nbsp;</td></tr></table>`;
      case "spacer": {
        const size = block.size && block.size >= 8 && block.size <= 120 ? block.size : 24;
        return `<div style="height:${size}px;line-height:${size}px;font-size:0">&nbsp;</div>`;
      }
      default:
        return "";
    }
  }
}
