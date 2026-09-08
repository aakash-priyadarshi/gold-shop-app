// One schema for the editor, saved designs and delivery-time validation.
export {
  OFFER_EMAIL_ANIMATIONS,
  OFFER_EMAIL_THEMES,
  OFFER_EMAIL_DESIGN_MAX_BLOCKS,
  OFFER_EMAIL_DESIGN_HTML_SOFT_LIMIT_BYTES,
  OFFER_EMAIL_DESIGN_HTML_HARD_LIMIT_BYTES,
  parseOfferEmailDesign,
  isValidOfferEmailDesign,
} from "@gold-shop/shared";
export type { OfferEmailAnimation, OfferEmailBlock, OfferEmailDesign, OfferEmailTheme } from "@gold-shop/shared";
