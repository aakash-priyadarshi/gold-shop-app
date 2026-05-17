"use client";

import { useEffect, useRef } from "react";
import { loadHardwareConfig } from "@/lib/posHardware";

/**
 * useBarcodeScanner – listens for keyboard-wedge HID barcode scanners.
 *
 * A wedge scanner types the barcode characters very quickly (< 50 ms between
 * keys) and finishes with Enter. We buffer keystrokes; if a burst arrives
 * within the threshold and ends in Enter, we emit the buffered string.
 *
 * The listener intentionally ignores events that target an editable element
 * (so manual typing in the POS search box still works). Pass
 * `ignoreEditable: false` to capture even when an input is focused (useful
 * when the focused input *is* meant to receive scans).
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
    if (!cfg.enabled || cfg.source !== "keyboard-wedge") return;

    let buffer = "";
    let lastTime = 0;

    const isEditableTarget = (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      return target.isContentEditable;
    };

    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (ignoreEditable && isEditableTarget(e.target)) return;

      const now = performance.now();
      const interval = now - lastTime;
      lastTime = now;

      if (interval > cfg.maxIntervalMs * 4) {
        // gap too long → previous buffer was likely human typing, reset
        buffer = "";
      }

      if (e.key === "Enter") {
        const code = buffer.trim();
        buffer = "";
        if (code.length >= cfg.minLength) {
          e.preventDefault();
          onScanRef.current(code);
        }
        return;
      }
      if (e.key.length === 1) {
        // printable
        buffer += e.key;
      } else {
        // non-printable key during burst – ignore
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [ignoreEditable, enabled]);
}
