/** Unwrap create-invoice API payloads ({ id }) or nested { data: { id } }. */
export function unwrapInvoiceRecord(
  payload: unknown,
): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.id === "string" && record.id.length > 0) {
    return record;
  }
  if (record.data && typeof record.data === "object") {
    return unwrapInvoiceRecord(record.data);
  }
  return null;
}

export function resolveCreatedInvoice(
  payload: unknown,
): { id: string; invoiceNumber?: string } | null {
  const record = unwrapInvoiceRecord(payload);
  if (!record) return null;
  return {
    id: record.id as string,
    invoiceNumber:
      typeof record.invoiceNumber === "string"
        ? record.invoiceNumber
        : undefined,
  };
}

export function isMobileShopContext(): boolean {
  if (typeof window === "undefined") return false;
  if (window.location.hostname.startsWith("m.")) return true;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

export function mobileInvoiceDetailPath(
  id: string,
  opts?: { created?: boolean },
): string {
  const query = opts?.created ? "?created=true" : "";
  return `/m/invoices/${id}${query}`;
}
