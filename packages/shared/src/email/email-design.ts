/**
 * Block-based email design schema for the advanced product-update builder.
 *
 * Designs are stored as JSON on OfferCampaign.emailDesign and rendered to
 * email-safe HTML by EmailDesignRendererService. Every field is re-validated
 * at parse time — the JSON column is never trusted at render time.
 */

export const OFFER_EMAIL_ANIMATIONS = ["none", "fadeIn", "slideUp"] as const;
export type OfferEmailAnimation = (typeof OFFER_EMAIL_ANIMATIONS)[number];

export type OfferEmailBlockStyle = {
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: "sans" | "serif";
  fontSize?: number;
  padding?: number;
  align?: "left" | "center";
  radius?: number;
};

export const OFFER_EMAIL_THEMES = ["classic", "editorial", "midnight"] as const;
export type OfferEmailTheme = (typeof OFFER_EMAIL_THEMES)[number];
export type OfferEmailGalleryImage = { url: string; alt: string; caption?: string; linkUrl?: string };

export type OfferEmailBlock = (
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
  | { type: "spacer"; size?: number }
  | { type: "gallery"; images: OfferEmailGalleryImage[] }
) & { id?: string; style?: OfferEmailBlockStyle };

export type OfferEmailDesign = {
  blocks: OfferEmailBlock[];
  preheader?: string;
  theme?: OfferEmailTheme;
};

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

function parseStyle(value: unknown, index: number): OfferEmailBlockStyle | undefined {
  if (value === undefined || value === null) return undefined;
  const raw = asRecord(value, index);
  const style: OfferEmailBlockStyle = {};
  for (const key of Object.keys(raw)) {
    if (!["backgroundColor", "textColor", "fontFamily", "fontSize", "padding", "align", "radius"].includes(key)) {
      fail(`Block ${index + 1}: unknown style property`);
    }
  }
  for (const key of ["backgroundColor", "textColor"] as const) {
    if (raw[key] === undefined) continue;
    if (typeof raw[key] !== "string" || !/^#[0-9a-f]{6}$/i.test(raw[key])) {
      fail(`Block ${index + 1}: ${key} must be a six-digit hex color`);
    }
    style[key] = raw[key] as string;
  }
  for (const [key, min, max] of [["fontSize", 12, 48], ["padding", 0, 48], ["radius", 0, 24]] as const) {
    const number = raw[key];
    if (number === undefined) continue;
    if (typeof number !== "number" || !Number.isInteger(number) || number < min || number > max) {
      fail(`Block ${index + 1}: ${key} must be between ${min} and ${max}`);
    }
    style[key] = number;
  }
  if (raw.fontFamily !== undefined) {
    if (raw.fontFamily !== "sans" && raw.fontFamily !== "serif") fail(`Block ${index + 1}: invalid font family`);
    style.fontFamily = raw.fontFamily;
  }
  if (raw.align !== undefined) {
    if (raw.align !== "left" && raw.align !== "center") fail(`Block ${index + 1}: invalid alignment`);
    style.align = raw.align;
  }
  return Object.keys(style).length ? style : undefined;
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
        const animation = optionalAnimation(block, index);
        return {
          type,
          text: requiredString(block, "text", index, 120),
          ...(animation ? { animation } : {}),
        };
      }
      case "text": {
        const align = optionalString(block, "align", index);
        if (align && align !== "left" && align !== "center") {
          fail(`Block ${index + 1}: align must be left or center`);
        }
        const animation = optionalAnimation(block, index);
        return {
          type,
          text: requiredString(block, "text", index, 2000),
          align: align === "center" ? "center" : "left",
          ...(animation ? { animation } : {}),
        };
      }
      case "image": {
        const animation = optionalAnimation(block, index);
        return {
          type,
          url: httpsUrl(requiredString(block, "url", index, 500), index, "url"),
          alt: requiredString(block, "alt", index, 200),
          linkUrl: optionalHttpsUrl(block, "linkUrl", index),
          ...(animation ? { animation } : {}),
        };
      }
      case "video": {
        const animation = optionalAnimation(block, index);
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
          ...(animation ? { animation } : {}),
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
      case "gallery": {
        if (!Array.isArray(block.images) || block.images.length < 2 || block.images.length > 3) {
          fail(`Block ${index + 1}: a gallery needs two or three images`);
        }
        return {
          type,
          images: block.images.map((item) => {
            const entry = asRecord(item, index);
            return {
              url: httpsUrl(requiredString(entry, "url", index, 500), index, "url"),
              alt: requiredString(entry, "alt", index, 200),
              caption: optionalString(entry, "caption", index)?.trim().slice(0, 160),
              linkUrl: optionalHttpsUrl(entry, "linkUrl", index),
            };
          }),
        };
      }
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

  const rawBlocks = raw.blocks;
  const result: OfferEmailDesign = {
    blocks: blocks.map((block, index) => {
      const rawBlock = asRecord(rawBlocks[index], index);
      const id = optionalString(rawBlock, "id", index);
      if (id && !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) fail(`Block ${index + 1}: invalid block ID`);
      const style = parseStyle(rawBlock.style, index);
      return { ...block, ...(id ? { id } : {}), ...(style ? { style } : {}) };
    }),
  };
  const ids = result.blocks.map((block) => block.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) fail("Email block IDs must be unique");
  if (raw.preheader !== undefined) {
    if (typeof raw.preheader !== "string" || raw.preheader.length > 180) fail("Preview text must be 180 characters or fewer");
    const preheader = raw.preheader.trim();
    if (preheader) result.preheader = preheader;
  }
  if (raw.theme !== undefined) {
    if (!(OFFER_EMAIL_THEMES as readonly unknown[]).includes(raw.theme)) fail("Unknown email theme");
    result.theme = raw.theme as OfferEmailTheme;
  }
  return result;
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
