"use client";

import { T } from "@/components/ui/T";
import { inventoryApi } from "@/lib/api";
import {
  BARCODE_DETECTOR_FORMATS,
  canUseGetUserMedia,
  getRearCameraStream,
  playScanVideo,
  prepareScanVideo,
} from "@/lib/camera-scan";
import { normalizeScanCode } from "@/lib/scan-code";
import { Camera, Keyboard, Loader2, ScanLine, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface BarcodeDetectorInstance {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}
interface BarcodeDetectorConstructor {
  new (opts?: { formats?: string[] }): BarcodeDetectorInstance;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

interface InventoryHit {
  id: string;
  sku?: string;
  nameEn?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  hint?: string;
  /** When set, typing a SKU lists matching in-stock items. */
  shopId?: string;
}

type ZxingControls = { stop: () => void };

/**
 * Bottom sheet for camera + typed SKU lookup. Hardware HID scanners are
 * handled by `useBarcodeScanner` on the parent screen.
 */
export function BarcodeScannerSheet({
  open,
  onClose,
  onScan,
  hint,
  shopId,
}: Props) {
  const cameraAvailable = canUseGetUserMedia();
  const [mode, setMode] = useState<"camera" | "manual">(
    cameraAvailable ? "camera" : "manual",
  );
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<InventoryHit[]>([]);
  const [searching, setSearching] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const zxingRef = useRef<ZxingControls | null>(null);
  const closedRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    detectorRef.current = null;
    try {
      zxingRef.current?.stop();
    } catch {
      /* already stopped */
    }
    zxingRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, []);

  const emitScan = useCallback(
    (raw: string) => {
      const code = normalizeScanCode(raw);
      if (!code || closedRef.current) return;
      closedRef.current = true;
      stopCamera();
      onScan(code);
    },
    [onScan, stopCamera],
  );

  const startZxing = useCallback(
    async (video: HTMLVideoElement, stream: MediaStream) => {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromStream(
        stream,
        video,
        (result, _err, ctrl) => {
          if (!result) return;
          try {
            ctrl.stop();
          } catch {
            /* ignore */
          }
          emitScan(result.getText());
        },
      );
      zxingRef.current = controls;
    },
    [emitScan],
  );

  const startCamera = useCallback(async () => {
    setError(null);
    closedRef.current = false;
    if (!canUseGetUserMedia()) {
      setMode("manual");
      setError("Camera is not available in this browser.");
      return;
    }
    try {
      const stream = await getRearCameraStream();
      if (closedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      prepareScanVideo(video, stream);
      await playScanVideo(video);

      if (window.BarcodeDetector) {
        try {
          detectorRef.current = new window.BarcodeDetector({
            formats: [...BARCODE_DETECTOR_FORMATS],
          });
          const tick = async () => {
            if (!videoRef.current || !detectorRef.current) return;
            try {
              const results = await detectorRef.current.detect(videoRef.current);
              if (results.length > 0) {
                emitScan(results[0].rawValue);
                return;
              }
            } catch {
              /* keep scanning */
            }
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
          return;
        } catch {
          detectorRef.current = null;
        }
      }

      await startZxing(video, stream);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Camera unavailable";
      const denied =
        /NotAllowed|Permission|denied|Permissions Policy/i.test(message);
      setError(
        denied
          ? "Camera permission was blocked. Allow camera for this site, then try again."
          : message,
      );
      setMode("manual");
    }
  }, [emitScan, startZxing]);

  useEffect(() => {
    if (!open) return;
    closedRef.current = false;
    if (mode === "camera") void startCamera();
    return stopCamera;
  }, [open, mode, startCamera, stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setManual("");
      setError(null);
      setHits([]);
      closedRef.current = false;
    }
  }, [open, stopCamera]);

  useEffect(() => {
    if (!open || !shopId || mode !== "manual") {
      setHits([]);
      return;
    }
    const q = manual.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await inventoryApi.getShopInventory(shopId, {
          search: q,
          limit: 8,
          page: 1,
          inStock: true,
          excludeSetComponents: true,
        });
        setHits(res.data?.items ?? res.data ?? []);
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [manual, mode, open, shopId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-t-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-semibold">
              <T>Scan barcode</T>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 px-4 pt-3">
          <button
            onClick={() => setMode("camera")}
            disabled={!cameraAvailable}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              mode === "camera"
                ? "bg-amber-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40"
            }`}
          >
            <Camera className="h-4 w-4" />
            <T>Camera</T>
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              mode === "manual"
                ? "bg-amber-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
            }`}
          >
            <Keyboard className="h-4 w-4" />
            <T>Type SKU</T>
          </button>
        </div>

        <div className="px-4 py-4 flex-1 overflow-y-auto">
          {hint && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-center">
              {hint}
            </p>
          )}

          {!cameraAvailable && (
            <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 rounded-xl px-3 py-2 mb-3 text-center">
              <T>
                Camera is not available here. Type the SKU, or connect a USB /
                Bluetooth barcode or RFID scanner.
              </T>
            </p>
          )}

          {mode === "camera" ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 aspect-[3/1] border-2 border-amber-400 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
              </div>
              {error && (
                <div className="absolute bottom-3 left-3 right-3 bg-red-500/90 text-white text-xs rounded-lg px-3 py-2 text-center">
                  {error}
                </div>
              )}
              <p className="absolute top-3 left-0 right-0 text-center text-white text-xs px-4">
                <T>Align barcode or QR inside the frame</T>
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const code = normalizeScanCode(manual);
                if (code) {
                  onScan(code);
                  setManual("");
                }
              }}
              className="space-y-3"
            >
              <input
                autoFocus
                data-pos-scan="true"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="SKU / RFID / QR"
                className="w-full px-4 py-3 text-base bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {searching && (
                <p className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <T>Searching inventory…</T>
                </p>
              )}
              {hits.length > 0 && (
                <ul className="space-y-1.5">
                  {hits.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onScan(item.sku || item.id)}
                        className="w-full rounded-xl border border-gray-100 dark:border-gray-800 px-3 py-2.5 text-left active:bg-amber-50 dark:active:bg-amber-950/40"
                      >
                        <span className="block text-sm font-semibold truncate">
                          {item.nameEn || item.sku}
                        </span>
                        {item.sku && (
                          <span className="block text-[11px] text-gray-500">
                            {item.sku}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="submit"
                disabled={!manual.trim()}
                className="w-full py-3 bg-amber-500 text-white text-sm font-semibold rounded-xl active:bg-amber-600 disabled:opacity-50"
              >
                <T>Find item</T>
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                <T>
                  USB and Bluetooth barcode or RFID guns work anywhere on this
                  screen. The camera reads printed barcodes and QR codes, not
                  UHF RFID chips.
                </T>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
