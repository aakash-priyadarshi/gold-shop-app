/**
 * Client-side QR generation for bill verification and UPI payment.
 * Prefers local data-URLs (no third-party image host); falls back to qrserver.
 */

import { buildQrImageUrl } from "@/lib/counterPayments";

export function verifyBillUrl(token: string): string {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://www.orivraa.com";
  return `${origin}/verify-bill/${encodeURIComponent(token)}`;
}

/** Async QR as a data URL (PNG). Falls back to external image URL on failure. */
export async function toQrDataUrl(
  data: string,
  size = 220,
): Promise<string> {
  try {
    const QRCode = (await import("qrcode")).default;
    return await QRCode.toDataURL(data, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
    });
  } catch {
    return buildQrImageUrl(data, size);
  }
}
