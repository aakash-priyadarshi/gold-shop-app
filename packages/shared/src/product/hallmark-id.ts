/**
 * Hallmark / HUID identifiers on jewellery.
 *
 * BIS HUID is a 6-character alphanumeric laser mark. Hallmark, assay, and
 * certificate numbers (and some gemstone report ids entered in the same
 * field) are often longer and may include hyphens.
 */

export const HALLMARK_ID_MAX_LENGTH = 32;

export type HallmarkIdKind = "empty" | "huid" | "hallmark";

export function normalizeHallmarkId(raw: string): string {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9\-\/]/g, "")
    .slice(0, HALLMARK_ID_MAX_LENGTH);
}

/** BIS Hallmark Unique ID: exactly 6 letters or digits, no hyphen. */
export function isBisHuid(value: string): boolean {
  return /^[A-Z0-9]{6}$/.test(value);
}

export function classifyHallmarkId(value: string): HallmarkIdKind {
  if (!value) return "empty";
  if (isBisHuid(value)) return "huid";
  return "hallmark";
}

export function hallmarkIdLabel(value: string): string {
  return classifyHallmarkId(value) === "huid" ? "HUID" : "Hallmark no.";
}
