/**
 * pdfkit only embeds PNG/JPEG. Shop logos on images.orivraa.com are often
 * WebP (even when the URL ends in .png) because of Cloudflare Polish / uploads.
 */

const LOGO_TTL_MS = 60 * 60 * 1000;
const logoCache = new Map<string, { buffer: Buffer; at: number }>();

export function isPdfKitImage(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  const isPng =
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  return isPng || isJpeg;
}

/** RIFF....WEBP */
export function isWebp(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  return (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  );
}

export async function toPdfKitPng(buf: Buffer): Promise<Buffer> {
  if (isPdfKitImage(buf)) return buf;
  const sharp = (await import("sharp")).default;
  return await sharp(buf)
    .rotate()
    .resize(420, 180, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 8 })
    .toBuffer();
}

export function getCachedLogo(url: string): Buffer | null {
  const hit = logoCache.get(url);
  if (!hit) return null;
  if (Date.now() - hit.at > LOGO_TTL_MS) {
    logoCache.delete(url);
    return null;
  }
  return hit.buffer;
}

export function setCachedLogo(url: string, buffer: Buffer): void {
  logoCache.set(url, { buffer, at: Date.now() });
}

export function clearLogoCache(): void {
  logoCache.clear();
}
