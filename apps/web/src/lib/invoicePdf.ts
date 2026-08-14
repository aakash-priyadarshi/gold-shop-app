import axios from "axios";
import { invoicesApi } from "@/lib/api";
import { isPhoneLikeDevice } from "./invoiceShare";

const PDF_CACHE_MS = 2 * 60 * 1000;
const pdfCache = new Map<
  string,
  { blob: Blob; filename: string; at: number }
>();

/** Drop a cached PDF after payment/void so Share/Download shows current balance. */
export function invalidateInvoicePdfCache(invoiceId?: string) {
  if (!invoiceId) {
    pdfCache.clear();
    return;
  }
  pdfCache.delete(invoiceId);
}

async function blobErrorMessage(blob: Blob, status: number): Promise<string> {
  try {
    const text = await blob.text();
    if (!text) return `PDF failed (${status})`;
    try {
      const json = JSON.parse(text) as { message?: string };
      if (json.message) return json.message;
    } catch {
      /* not JSON */
    }
    return text.slice(0, 200);
  } catch {
    return `PDF failed (${status})`;
  }
}

async function asPdfBlob(blob: Blob): Promise<Blob> {
  const head = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  const magic = String.fromCharCode(...Array.from(head));
  if (magic.startsWith("%PDF")) {
    if (blob.type === "application/pdf") return blob;
    return new Blob([blob], { type: "application/pdf" });
  }
  throw new Error(await blobErrorMessage(blob, 0));
}

/** Fetch on-demand invoice PDF (not stored server-side). */
export async function fetchInvoicePdfBlob(invoiceId: string): Promise<{
  blob: Blob;
  filename: string;
}> {
  const cached = pdfCache.get(invoiceId);
  if (cached && Date.now() - cached.at < PDF_CACHE_MS) {
    return { blob: cached.blob, filename: cached.filename };
  }

  try {
    const res = await invoicesApi.getPdf(invoiceId);
    const disposition = String(res.headers["content-disposition"] || "");
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || `Invoice-${invoiceId}.pdf`;
    const blob = await asPdfBlob(res.data);
    pdfCache.set(invoiceId, { blob, filename, at: Date.now() });
    return { blob, filename };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
      const message = await blobErrorMessage(
        err.response.data,
        err.response.status ?? 0,
      );
      throw new Error(message);
    }
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      throw new Error(String(err.response.data.message));
    }
    if (axios.isAxiosError(err) && err.code === "ECONNABORTED") {
      throw new Error("PDF timed out — try Download PDF");
    }
    const fallback =
      err instanceof Error ? err.message : "PDF generation failed";
    if (/network error/i.test(fallback)) {
      throw new Error(
        "Could not download the PDF. Check your connection and try again.",
      );
    }
    throw err instanceof Error ? err : new Error("PDF generation failed");
  }
}

export function buildInvoicePdfFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: "application/pdf" });
}

export {
  canShareFiles,
  isNativeFileShareReliable,
  isPhoneLikeDevice,
  isUserShareCancel,
  sharePdfWithFallbacks,
} from "./invoiceShare";

/** Warm the PDF on phones before Share — skip on desktop to avoid SW races. */
export function prefetchInvoicePdf(invoiceId: string): void {
  if (!invoiceId || !isPhoneLikeDevice()) return;
  void fetchInvoicePdfBlob(invoiceId).catch(() => undefined);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
