import type { OfferEmailBlock } from "@/lib/api";

export type EmailBlockPreset = {
  id: string;
  label: string;
  description: string;
  blocks: OfferEmailBlock[];
};

/**
 * Starting layouts for the advanced product-update email builder. Every
 * preset keeps the same visual language as the Orivraa email templates and
 * only uses https URLs, which the backend renderer enforces.
 */
export const EMAIL_BLOCK_PRESETS: EmailBlockPreset[] = [
  {
    id: "product-spotlight",
    label: "Product spotlight",
    description: "Hero GIF, short story, one clear call to action.",
    blocks: [
      {
        type: "image",
        url: "https://www.orivraa.com/ai-photo-studio-demo.gif",
        alt: "Product demo animation",
        animation: "fadeIn",
      },
      { type: "heading", text: "What's new in your shop" },
      {
        type: "text",
        text: "Open Product Catalog, pick a photo, and tap Enhance. The jewellery stays exactly as it is — only the lighting changes.",
      },
      {
        type: "button",
        label: "Try it now",
        url: "https://www.orivraa.com/jewellery-shop-software",
      },
    ],
  },
  {
    id: "feature-tour",
    label: "Feature tour",
    description: "Three alternating image and text sections.",
    blocks: [
      { type: "heading", text: "Three upgrades you asked for" },
      {
        type: "text",
        text: "We shipped improvements across the catalog, quotes, and invoices.",
      },
      { type: "divider" },
      {
        type: "image",
        url: "https://www.orivraa.com/ai-photo-studio-demo.gif",
        alt: "First feature preview",
        animation: "fadeIn",
      },
      { type: "heading", text: "1. Studio photos in one tap" },
      {
        type: "text",
        text: "Turn a shop photo into a listing-ready image without a photoshoot.",
      },
      { type: "divider" },
      {
        type: "image",
        url: "https://www.orivraa.com/ai-photo-studio-demo.gif",
        alt: "Second feature preview",
        animation: "fadeIn",
      },
      { type: "heading", text: "2. Faster quotes" },
      {
        type: "text",
        text: "Send a polished quote in under a minute from your phone.",
      },
      { type: "divider" },
      {
        type: "button",
        label: "Explore the updates",
        url: "https://www.orivraa.com/jewellery-shop-software",
        variant: "secondary",
      },
    ],
  },
  {
    id: "demo-announcement",
    label: "Demo announcement",
    description: "Linked video poster with a watch-demo button.",
    blocks: [
      { type: "heading", text: "See it in action", animation: "fadeIn" },
      {
        type: "text",
        text: "A 30-second walkthrough of the new workflow, from catalog to customer.",
        align: "center",
      },
      {
        type: "video",
        posterUrl: "https://www.orivraa.com/ai-photo-studio-demo.gif",
        videoUrl: "https://www.orivraa.com/jewellery-shop-software#ai-photo-studio",
        label: "Watch the demo",
        animation: "slideUp",
      },
      {
        type: "text",
        text: "Emails play a preview image; the button opens the full demo in your browser.",
        align: "center",
      },
    ],
  },
];
