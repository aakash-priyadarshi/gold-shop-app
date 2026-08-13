/** True on phones / tablets where OS share + thermal BLE make sense. */
export function isPhoneLikeDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ Safari reports as Macintosh
  const nav = navigator as Navigator & { maxTouchPoints?: number };
  return /Macintosh/i.test(ua) && (nav.maxTouchPoints || 0) > 1;
}

/** True on phones where the OS share sheet can attach a PDF. */
export function isNativeFileShareReliable(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  // Windows/macOS expose navigator.share but file share throws NetworkError.
  return isPhoneLikeDevice();
}

export function isUserShareCancel(err: unknown): boolean {
  const e = err as { name?: string; message?: string };
  return (
    e?.name === "AbortError" ||
    /share canceled|share cancelled|abort/i.test(e?.message || "")
  );
}

export function canShareFiles(): boolean {
  if (!isNativeFileShareReliable()) return false;
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (typeof nav.canShare !== "function") {
    return true;
  }
  try {
    const probe = new File(["x"], "probe.pdf", { type: "application/pdf" });
    return nav.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Android WhatsApp often rejects { text, files } together (throws NetworkError).
 * Desktop Chrome/Edge share throws NetworkError for files — skip it entirely.
 */
export async function sharePdfWithFallbacks(opts: {
  file: File;
  text: string;
  title: string;
}): Promise<"shared" | "cancelled" | "fallback"> {
  if (!isNativeFileShareReliable()) {
    return "fallback";
  }

  const payloads: ShareData[] = [
    { title: opts.title, files: [opts.file], text: opts.text },
    { title: opts.title, files: [opts.file] },
    { title: opts.title, text: opts.text },
  ];

  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };

  for (const data of payloads) {
    if (typeof nav.canShare === "function") {
      try {
        if (!nav.canShare(data)) continue;
      } catch {
        continue;
      }
    }
    try {
      await navigator.share(data);
      return "shared";
    } catch (err) {
      if (isUserShareCancel(err)) return "cancelled";
    }
  }
  return "fallback";
}
