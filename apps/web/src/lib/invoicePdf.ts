import { getApiUrl } from "@/lib/api";

function authHeader(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Fetch on-demand invoice PDF (not stored server-side). */
export async function fetchInvoicePdfBlob(invoiceId: string): Promise<{
  blob: Blob;
  filename: string;
}> {
  const res = await fetch(`${getApiUrl()}/invoices/${invoiceId}/pdf`, {
    headers: {
      ...authHeader(),
      Accept: "application/pdf",
    },
  });
  if (!res.ok) {
    const message = await res.text().catch(() => "PDF generation failed");
    throw new Error(message || `PDF failed (${res.status})`);
  }
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || `Invoice-${invoiceId}.pdf`;
  const blob = await res.blob();
  return { blob, filename };
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
