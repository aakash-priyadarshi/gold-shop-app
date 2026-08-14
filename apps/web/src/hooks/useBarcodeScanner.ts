"use client";

import { useEffect, useRef } from "react";
import { loadHardwareConfig } from "@/lib/posHardware";
import {
  applyWedgeKey,
  isEditableTarget,
  isPosScanField,
} from "@/lib/scan-code";

/**
 * Listens for keyboard-wedge HID barcode / RFID-EPC / QR scanners.
 *
 * A wedge scanner types characters in a burst and finishes with Enter or Tab.
 * Camera scanning is separate (BarcodeScannerSheet). HID guns still work even
 * when hardware settings list the source as "camera" or "manual".
 *
 * Editable fields are ignored unless they opt in with `data-pos-scan`.
 */
export function useBarcodeScanner(
  onScan: (code: string) => void,
  options: { ignoreEditable?: boolean; enabled?: boolean } = {},
) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const { ignoreEditable = true, enabled = true } = options;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const cfg = loadHardwareConfig().scanner;
    if (!cfg.enabled) return;

    let state = { buffer: "", lastTime: 0 };

    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const onScanField = isPosScanField(e.target);
      if (ignoreEditable && isEditableTarget(e.target) && !onScanField) {
        return;
      }

      const result = applyWedgeKey(state, e.key, performance.now(), {
        minLength: cfg.minLength,
        maxIntervalMs: cfg.maxIntervalMs,
      });
      state = result.state;

      if (result.commit) {
        e.preventDefault();
        e.stopPropagation();
        onScanRef.current(result.commit);
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [ignoreEditable, enabled]);
}
