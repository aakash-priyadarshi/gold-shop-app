import axios from "axios";
import { invoicesApi } from "@/lib/api";

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

/** Fetch on-demand invoice PDF (not stored server-side). */
export async function fetchInvoicePdfBlob(invoiceId: string): Promise<{
  blob: Blob;
  filename: string;
}> {
  try {
    const res = await invoicesApi.getPdf(invoiceId);
    const disposition = String(res.headers["content-disposition"] || "");
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || `Invoice-${invoiceId}.pdf`;
    return { blob: res.data, filename };
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
    throw err instanceof Error ? err : new Error("PDF generation failed");
  }
}

export function buildInvoicePdfFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: "application/pdf" });
}

export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (typeof nav.canShare !== "function") {
    // Optimistic: many Android browsers support files without canShare
    return true;
  }
  try {
    const probe = new File(["x"], "probe.pdf", { type: "application/pdf" });
    return nav.canShare({ files: [probe] });
  } catch {
    return false;
  }
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
