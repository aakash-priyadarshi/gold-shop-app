/**
 * Block-based email design schema for the advanced product-update builder.
 *
 * Designs are stored as JSON on OfferCampaign.emailDesign and rendered to
 * email-safe HTML by EmailDesignRendererService. Every field is re-validated
 * at parse time — the JSON column is never trusted at render time.
 */

export const OFFER_EMAIL_ANIMATIONS = ["none", "fadeIn", "slideUp"] as const;
export type OfferEmailAnimation = (typeof OFFER_EMAIL_ANIMATIONS)[number];

export type OfferEmailBlock =
  | {
      type: "heading";
      text: string;
      animation?: OfferEmailAnimation;
    }
  | {
      type: "text";
      text: string;
      align?: "left" | "center";
      animation?: OfferEmailAnimation;
    }
  | {
      type: "image";
      url: string;
      alt: string;
      linkUrl?: string;
      animation?: OfferEmailAnimation;
    }
  | {
      type: "video";
      posterUrl: string;
      videoUrl: string;
      label?: string;
      animation?: OfferEmailAnimation;
    }
  | {
      type: "button";
      label: string;
      url: string;
      variant?: "primary" | "secondary";
    }
  | { type: "divider" }
  | { type: "spacer"; size?: number };

export type OfferEmailDesign = { blocks: OfferEmailBlock[] };

export const OFFER_EMAIL_DESIGN_MAX_BLOCKS = 40;
// Gmail starts clipping the rendered HTML around 102 KB; keep headroom.
export const OFFER_EMAIL_DESIGN_HTML_SOFT_LIMIT_BYTES = 90 * 1024;
export const OFFER_EMAIL_DESIGN_HTML_HARD_LIMIT_BYTES = 102 * 1024;

function fail(message: string): never {
  throw new Error(message);
}

function asRecord(value: unknown, index: number): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`Block ${index + 1} must be an object`);
  }
  return value as Record<string, unknown>;
}

function optionalString(
  block: Record<string, unknown>,
  key: string,
  index: number,
): string | undefined {
  const value = block[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    fail(`Block ${index + 1}: ${key} must be text`);
  }
  return value;
}

function requiredString(
  block: Record<string, unknown>,
  key: string,
  index: number,
  maxLength: number,
): string {
  const value = optionalString(block, key, index);
  if (!value) fail(`Block ${index + 1}: ${key} is required`);
  const trimmed = value.trim();
  if (!trimmed) fail(`Block ${index + 1}: ${key} is required`);
  if (trimmed.length > maxLength) {
    fail(`Block ${index + 1}: ${key} must be ${maxLength} characters or fewer`);
  }
  return trimmed;
}

/** Only https URLs are accepted so rendered emails cannot mix content or run schemes. */
function httpsUrl(value: string, index: number, field: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    fail(`Block ${index + 1}: ${field} must be a valid URL`);
  }
  if (parsed.protocol !== "https:" || !parsed.hostname) {
    fail(`Block ${index + 1}: ${field} must be an https URL`);
  }
  return parsed.toString();
}

function optionalHttpsUrl(
  block: Record<string, unknown>,
  key: string,
  index: number,
): string | undefined {
  const value = optionalString(block, key, index);
  return value ? httpsUrl(value.trim(), index, key) : undefined;
}

function optionalAnimation(
  block: Record<string, unknown>,
  index: number,
): OfferEmailAnimation | undefined {
  const value = optionalString(block, "animation", index);
  if (!value || value === "none") return undefined;
  if (!(OFFER_EMAIL_ANIMATIONS as readonly string[]).includes(value)) {
    fail(`Block ${index + 1}: unknown animation "${value}"`);
  }
  return value as OfferEmailAnimation;
}

/**
 * Validates an untrusted design payload (Prisma JSON or request body) and
 * rebuilds it into a normalized block list. Throws Error with a readable
 * message on the first invalid block.
 */
export function parseOfferEmailDesign(input: unknown): OfferEmailDesign {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    fail("Email design must be an object with a blocks array");
  }
  const raw = input as Record<string, unknown>;
  if (!Array.isArray(raw.blocks)) {
    fail("Email design must include a blocks array");
  }
  if (raw.blocks.length === 0) {
    fail("Email design needs at least one block");
  }
  if (raw.blocks.length > OFFER_EMAIL_DESIGN_MAX_BLOCKS) {
    fail(`Email design supports up to ${OFFER_EMAIL_DESIGN_MAX_BLOCKS} blocks`);
  }

  const blocks = raw.blocks.map((item, index): OfferEmailBlock => {
    const block = asRecord(item, index);
    const type = block.type;
    switch (type) {
      case "heading": {
        return {
          type,
          text: requiredString(block, "text", index, 120),
          animation: optionalAnimation(block, index),
        };
      }
      case "text": {
        const align = optionalString(block, "align", index);
        if (align && align !== "left" && align !== "center") {
          fail(`Block ${index + 1}: align must be left or center`);
        }
        return {
          type,
          text: requiredString(block, "text", index, 2000),
          align: align === "center" ? "center" : "left",
          animation: optionalAnimation(block, index),
        };
      }
      case "image": {
        return {
          type,
          url: httpsUrl(requiredString(block, "url", index, 500), index, "url"),
          alt: requiredString(block, "alt", index, 200),
          linkUrl: optionalHttpsUrl(block, "linkUrl", index),
          animation: optionalAnimation(block, index),
        };
      }
      case "video": {
        return {
          type,
          posterUrl: httpsUrl(
            requiredString(block, "posterUrl", index, 500),
            index,
            "posterUrl",
          ),
          videoUrl: httpsUrl(
            requiredString(block, "videoUrl", index, 500),
            index,
            "videoUrl",
          ),
          label: optionalString(block, "label", index)?.trim().slice(0, 80),
          animation: optionalAnimation(block, index),
        };
      }
      case "button": {
        const variant = optionalString(block, "variant", index);
        if (variant && variant !== "primary" && variant !== "secondary") {
          fail(`Block ${index + 1}: variant must be primary or secondary`);
        }
        return {
          type,
          label: requiredString(block, "label", index, 60),
          url: httpsUrl(requiredString(block, "url", index, 500), index, "url"),
          variant: variant === "secondary" ? "secondary" : "primary",
        };
      }
      case "divider":
        return { type };
      case "spacer": {
        const rawSize = block.size;
        if (rawSize === undefined || rawSize === null) return { type };
        if (
          typeof rawSize !== "number" ||
          !Number.isInteger(rawSize) ||
          rawSize < 8 ||
          rawSize > 120
        ) {
          fail(`Block ${index + 1}: spacer size must be between 8 and 120`);
        }
        return { type, size: rawSize };
      }
      default:
        fail(`Block ${index + 1}: unknown block type`);
    }
  });

  return { blocks };
}

/** Type guard used at delivery time to decide between design and template rendering. */
export function isValidOfferEmailDesign(value: unknown): value is OfferEmailDesign {
  try {
    parseOfferEmailDesign(value);
    return true;
  } catch {
    return false;
  }
}
