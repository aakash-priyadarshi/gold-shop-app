import {
  parseOfferEmailDesign,
  OfferEmailRenderer,
  OFFER_EMAIL_DESIGN_HTML_HARD_LIMIT_BYTES,
  type OfferEmailBlock,
  type OfferEmailDesign,
} from "@gold-shop/shared";
import type { OfferCampaign } from "@/lib/api";
import { EMAIL_BLOCK_PRESETS } from "./emailBlockPresets";

export type StudioDraft = OfferEmailDesign & { emailSubject: string };
export type RecoveredDraft = { version: 1; savedAt: number; base: string; draft: StudioDraft };
export const BLOCK_LABELS: Record<OfferEmailBlock["type"], string> = {
  heading: "Heading", text: "Text", image: "Image or GIF", video: "Demo video",
  gallery: "Gallery", button: "Button", divider: "Divider", spacer: "Spacer",
};
export const newBlockId = () => `section-${crypto.randomUUID()}`;
export const cloneBlocks = (blocks: OfferEmailBlock[]) => blocks.map((block) => ({
  ...JSON.parse(JSON.stringify(block)), id: newBlockId(),
})) as OfferEmailBlock[];
export function campaignDraft(campaign: OfferCampaign): StudioDraft {
  return {
    emailSubject: campaign.emailSubject,
    preheader: campaign.emailDesign?.preheader || "",
    theme: campaign.emailDesign?.theme || "classic",
    blocks: (campaign.emailDesign?.blocks || EMAIL_BLOCK_PRESETS[0].blocks).map((block) => ({
      ...JSON.parse(JSON.stringify(block)), id: block.id || newBlockId(),
    })),
  };
}
export const campaignRevision = (campaign: OfferCampaign) =>
  campaign.updatedAt || JSON.stringify([campaign.emailSubject, campaign.emailDesign]);
export const draftStorageKey = (userId: string, campaignKey: string) =>
  `orivraa:email-studio:v1:${encodeURIComponent(userId)}:${encodeURIComponent(campaignKey)}`;

/** Recovery must accept unfinished fields, while rejecting incompatible/corrupt storage. */
export function readRecovery(key: string): RecoveredDraft | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    if (raw.length > 300_000) throw new Error("oversized");
    const record = JSON.parse(raw) as RecoveredDraft;
    const draft = record.draft;
    if (record.version !== 1 || typeof record.base !== "string" || !Number.isFinite(record.savedAt) ||
        record.savedAt > Date.now() || Date.now() - record.savedAt > 7 * 86400_000 ||
        !draft || typeof draft.emailSubject !== "string" ||
        (draft.preheader !== undefined && typeof draft.preheader !== "string") ||
        ![undefined, "classic", "editorial", "midnight"].includes(draft.theme) ||
        !Array.isArray(draft.blocks) || draft.blocks.length > 40) throw new Error("invalid");
    const ids = new Set<string>();
    for (const block of draft.blocks) {
      if (!block || typeof block !== "object" || !Object.prototype.hasOwnProperty.call(BLOCK_LABELS, block.type) ||
          typeof block.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(block.id) || ids.has(block.id)) throw new Error("invalid");
      ids.add(block.id);
      // An invalid URL or missing text is recoverable. Wrong field types are not.
      const fields = block.type === "heading" || block.type === "text" ? ["text"] :
        block.type === "image" ? ["url", "alt"] : block.type === "video" ? ["posterUrl", "videoUrl"] :
        block.type === "button" ? ["label", "url"] : [];
      for (const field of fields) if (typeof (block as unknown as Record<string, unknown>)[field] !== "string") throw new Error("invalid");
      if (block.style) parseOfferEmailDesign({ blocks: [{ type: "divider", style: block.style }] });
      if (block.type === "gallery" && (!Array.isArray(block.images) || block.images.length < 2 || block.images.length > 3 ||
          block.images.some((entry) => !entry || typeof entry.url !== "string" || typeof entry.alt !== "string" || (entry.caption !== undefined && typeof entry.caption !== "string")))) throw new Error("invalid");
    }
    return record;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function emptyBlock(type: OfferEmailBlock["type"]): OfferEmailBlock {
  const id = newBlockId();
  switch (type) {
    case "heading": return { id, type, text: "Your next big update" };
    case "text": return { id, type, text: "Tell your customers what changed and why it matters." };
    case "image": return { id, type, url: "", alt: "" };
    case "video": return { id, type, posterUrl: "", videoUrl: "", label: "Watch the demo" };
    case "gallery": return { id, type, images: [{ url: "", alt: "", caption: "Before" }, { url: "", alt: "", caption: "After" }] };
    case "button": return { id, type, label: "Explore the update", url: "", variant: "primary" };
    case "divider": return { id, type };
    case "spacer": return { id, type, size: 24 };
  }
}

const renderer = new OfferEmailRenderer();
/** Invalid sections remain editable in place; only the preview gets a placeholder. */
export function studioPreview(draft: StudioDraft, campaignName: string, placeholder: string) {
  const issues: { id?: string; message: string }[] = [];
  const blocks = draft.blocks.map((block, index): OfferEmailBlock => {
    try { return parseOfferEmailDesign({ blocks: [block] }).blocks[0]; }
    catch (error) {
      issues.push({ id: block.id, message: (error as Error).message.replace("Block 1", `Block ${index + 1}`) });
      return { type: "text", id: block.id, text: placeholder, style: { backgroundColor: "#fff5e5", padding: 24 } };
    }
  });
  if (draft.emailSubject.trim().length < 3 || draft.emailSubject.trim().length > 180)
    issues.unshift({ message: "Write an email subject between 3 and 180 characters." });
  if (!blocks.length) issues.push({ message: "Add at least one section to the email." });
  if ((draft.preheader?.length || 0) > 180) issues.push({ message: "Preheader must be 180 characters or fewer." });
  const options = {
    campaignName, firstName: "Shop owner", unsubscribeUrl: "#",
    brandIconUrl: "https://www.orivraa.com/favicon/android-chrome-192x192.png",
    preheader: draft.preheader?.slice(0, 180), theme: draft.theme,
  };
  const previewBlocks = blocks.length ? blocks : [{ type: "text" as const, text: placeholder }];
  const rendered = renderer.render(previewBlocks, options);
  if (rendered.bytes > OFFER_EMAIL_DESIGN_HTML_HARD_LIMIT_BYTES)
    issues.push({ message: "This email exceeds 102 KB. Shorten the text or remove sections before saving." });
  return { blocks: previewBlocks, options, bytes: rendered.bytes, issues };
}
