/**
 * Keyboard-wedge / HID scanner helpers used by POS (USB, Bluetooth, RFID guns).
 * Camera decoding lives in camera-scan.ts + BarcodeScannerSheet.
 */

export function normalizeScanCode(raw: string): string {
  return String(raw ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^(EPC|RFID|URN:EPC:ID:)[:\s]*/i, "")
    .trim();
}

export function isScanSuffixKey(key: string): boolean {
  return key === "Enter" || key === "Tab";
}

export function isPosScanField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement && target.closest("[data-pos-scan]") != null
  );
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return target.isContentEditable;
}

export type WedgeState = { buffer: string; lastTime: number };

/**
 * HID scanners type a burst of characters then Enter (sometimes Tab).
 * Human typing has larger gaps, so we reset the buffer after a pause.
 */
export function applyWedgeKey(
  state: WedgeState,
  key: string,
  now: number,
  cfg: { minLength: number; maxIntervalMs: number },
): { state: WedgeState; commit?: string } {
  const interval = now - state.lastTime;
  const buffer =
    state.buffer && interval > cfg.maxIntervalMs * 4 ? "" : state.buffer;
  const nextTime = now;

  if (isScanSuffixKey(key)) {
    const code = normalizeScanCode(buffer);
    return {
      state: { buffer: "", lastTime: nextTime },
      commit: code.length >= cfg.minLength ? code : undefined,
    };
  }

  if (key.length === 1) {
    return { state: { buffer: buffer + key, lastTime: nextTime } };
  }

  return { state: { buffer, lastTime: nextTime } };
}
