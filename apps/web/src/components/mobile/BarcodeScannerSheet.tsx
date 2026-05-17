"use client";

import { T } from "@/components/ui/T";
import { hasBarcodeDetector, hasCameraScanning } from "@/lib/posHardware";
import { Camera, Keyboard, ScanLine, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface BarcodeDetectorInstance {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}
interface BarcodeDetectorConstructor {
  new (opts?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  /** Optional hint shown above the input. */
  hint?: string;
}

/**
 * Bottom sheet for scanning a barcode either with the rear camera (when the
 * browser exposes the BarcodeDetector API) or by typing/pasting the code.
 * Hardware HID scanners feed `onScan` via the global `useBarcodeScanner`
 * hook used in the parent screen, so this sheet doesn't need to know about
 * them.
 */
export function BarcodeScannerSheet({ open, onClose, onScan, hint }: Props) {
  const [mode, setMode] = useState<"camera" | "manual">(
    hasBarcodeDetector() && hasCameraScanning() ? "camera" : "manual",
  );
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const cameraAvailable = hasBarcodeDetector() && hasCameraScanning();

  const stopCamera = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    if (!window.BarcodeDetector) {
      setMode("manual");
      return;
    }
    try {
      detectorRef.current = new window.BarcodeDetector({
        formats: [
          "code_128",
          "code_39",
          "ean_13",
          "ean_8",
          "qr_code",
          "upc_a",
          "upc_e",
          "itf",
        ],
      });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const tick = async () => {
        if (!videoRef.current || !detectorRef.current) return;
        try {
          const results = await detectorRef.current.detect(videoRef.current);
          if (results.length > 0) {
            const code = results[0].rawValue;
            stopCamera();
            onScan(code);
            return;
          }
        } catch {
          // detection errors are non-fatal; keep scanning
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e: any) {
      setError(e?.message ?? "Camera unavailable");
      setMode("manual");
    }
  }, [onScan, stopCamera]);

  useEffect(() => {
    if (!open) return;
    if (mode === "camera") startCamera();
    return stopCamera;
  }, [open, mode, startCamera, stopCamera]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setManual("");
      setError(null);
    }
  }, [open, stopCamera]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className="w-full max-w-lg bg-white rounded-t-3xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-semibold text-gray-900">
              <T>Scan barcode</T>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 px-4 pt-3">
          <button
            onClick={() => setMode("camera")}
            disabled={!cameraAvailable}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
              mode === "camera"
                ? "bg-amber-500 text-white"
                : "bg-gray-100 text-gray-600 disabled:opacity-40"
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
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <Keyboard className="h-4 w-4" />
            <T>Type SKU</T>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 flex-1 overflow-y-auto">
          {hint && (
            <p className="text-xs text-gray-500 mb-3 text-center">{hint}</p>
          )}

          {!cameraAvailable && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-3 text-center">
              <T>
                Camera scanning is not supported by this browser. Type the SKU
                here, or connect a USB/Bluetooth scanner and scan anywhere on
                the POS screen.
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
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 aspect-[3/1] border-2 border-amber-400 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
              </div>
              {error && (
                <div className="absolute bottom-3 left-3 right-3 bg-red-500/90 text-white text-xs rounded-lg px-3 py-2 text-center">
                  {error}
                </div>
              )}
              <p className="absolute top-3 left-0 right-0 text-center text-white text-xs">
                <T>Align barcode inside the frame</T>
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const code = manual.trim();
                if (code) {
                  onScan(code);
                  setManual("");
                }
              }}
              className="space-y-3"
            >
              <input
                autoFocus
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="SKU / barcode"
                className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="submit"
                disabled={!manual.trim()}
                className="w-full py-3 bg-amber-500 text-white text-sm font-semibold rounded-xl active:bg-amber-600 disabled:opacity-50"
              >
                <T>Find item</T>
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                <T>
                  Tip: connect a USB or Bluetooth barcode scanner – it works
                  anywhere in the POS without opening this dialog.
                </T>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
