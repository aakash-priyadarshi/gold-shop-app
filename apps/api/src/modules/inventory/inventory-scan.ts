/**
 * Shared scan-code parsing for POS lookup (QR tags, RFID/EPC guns, SKU).
 * Kept free of Nest/Prisma so unit tests stay cheap.
 */

export function normalizeInventoryScanCode(code: string): string {
  return String(code ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^(EPC|RFID|URN:EPC:ID:)[:\s]*/i, "")
    .trim();
}

/** Canonical payload encoded in an Orivraa inventory QR label. */
export function parseInventoryTagCode(code: string): string | null {
  const trimmed = normalizeInventoryScanCode(code);
  const match = /^orivraa:inventory:([a-z0-9-]{8,})$/i.exec(trimmed);
  if (match?.[1]) return match[1];

  try {
    const url = new URL(trimmed);
    const fromQuery =
      url.searchParams.get("item") ||
      url.searchParams.get("inventoryId") ||
      url.searchParams.get("id");
    if (fromQuery && /^[a-z0-9-]{8,}$/i.test(fromQuery)) return fromQuery;
  } catch {
    /* not a URL */
  }

  return null;
}
