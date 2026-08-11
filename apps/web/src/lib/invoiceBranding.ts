import type { BillSettings } from "@/lib/billPrint";

/** Nest/axios payloads may be the row or `{ data: row }`. */
export function unwrapInvoiceSettingsResponse(
  body: unknown,
): BillSettings | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const row =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;
  return row as BillSettings;
}

export function resolveBillShopName(
  settings: BillSettings | null | undefined,
  invoiceSupplierName?: string | null,
  fallbackShopName?: string | null,
): string {
  return (
    settings?.shopNameOnBill?.trim() ||
    invoiceSupplierName?.trim() ||
    fallbackShopName?.trim() ||
    ""
  );
}

export function resolveBillShopAddress(
  settings: BillSettings | null | undefined,
  invoiceSupplierAddress?: string | null,
): string {
  return settings?.shopAddress?.trim() || invoiceSupplierAddress?.trim() || "";
}

export function resolveBillShopPhone(
  settings: BillSettings | null | undefined,
  invoiceSupplierPhone?: string | null,
): string {
  return settings?.shopPhone?.trim() || invoiceSupplierPhone?.trim() || "";
}
