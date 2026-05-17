/**
 * POS Hardware abstraction layer for Orivraa shopkeepers.
 *
 * Supports:
 *   • Barcode scanners    – any HID keyboard-wedge scanner (USB or Bluetooth).
 *                            The browser sees rapid keystrokes ending in Enter,
 *                            so we just listen at the document level.
 *                            (Camera scanning lives in BarcodeScannerSheet.tsx
 *                             using the built-in BarcodeDetector API.)
 *   • Receipt printers    – ESC/POS thermal printers over WebUSB (Epson TM,
 *                            Star micronics, generic 58mm/80mm Bluetooth printers
 *                            that expose a USB CDC interface).
 *   • Cash drawers        – kicked via the standard ESC/POS DLE DC4 / ESC p 0
 *                            pulse command sent through the receipt printer.
 *   • Network printers    – plain TCP raw 9100 (handled server-side later;
 *                            for now we store the config so the desktop /
 *                            Tauri app can reuse it).
 *
 * Config is persisted in localStorage so it survives reloads on the same
 * device. The same keys are read by the mobile POS and (later) the desktop app.
 */

export type ScannerSource = "keyboard-wedge" | "camera" | "manual";

export interface ScannerConfig {
  /** Which input methods are enabled. */
  enabled: boolean;
  source: ScannerSource;
  /** Minimum length to accept a scan – avoids treating short typing as a scan. */
  minLength: number;
  /** Max ms between characters to still treat them as a single scan burst. */
  maxIntervalMs: number;
  /** Auto-add to cart on successful scan (vs. confirm step). */
  autoAdd: boolean;
}

export type PrinterTransport = "webusb" | "bluetooth" | "network" | "none";
export type PaperWidth = 58 | 80;

export interface PrinterConfig {
  enabled: boolean;
  transport: PrinterTransport;
  paperWidth: PaperWidth;
  /** Stored when user pairs a device – we re-use the same device by serial. */
  deviceLabel?: string;
  /** Network printer only. */
  host?: string;
  port?: number;
  /** Auto-print receipt when a bill is created. */
  autoPrint: boolean;
  /** Open the cash drawer on every cash bill. */
  kickCashDrawer: boolean;
}

export interface HardwareConfig {
  scanner: ScannerConfig;
  printer: PrinterConfig;
}

const STORAGE_KEY = "orivraa.posHardware.v1";

export const defaultHardwareConfig: HardwareConfig = {
  scanner: {
    enabled: true,
    source: "keyboard-wedge",
    minLength: 4,
    maxIntervalMs: 50,
    autoAdd: true,
  },
  printer: {
    enabled: false,
    transport: "none",
    paperWidth: 80,
    autoPrint: false,
    kickCashDrawer: false,
  },
};

export function loadHardwareConfig(): HardwareConfig {
  if (typeof window === "undefined") return defaultHardwareConfig;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultHardwareConfig;
    const parsed = JSON.parse(raw);
    return {
      scanner: { ...defaultHardwareConfig.scanner, ...(parsed.scanner ?? {}) },
      printer: { ...defaultHardwareConfig.printer, ...(parsed.printer ?? {}) },
    };
  } catch {
    return defaultHardwareConfig;
  }
}

export function saveHardwareConfig(cfg: HardwareConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore quota errors
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Capability probes – tell the UI which buttons are usable on this device.
// ────────────────────────────────────────────────────────────────────────────

export function hasBarcodeDetector(): boolean {
  if (typeof window === "undefined") return false;
  return "BarcodeDetector" in window;
}

export function hasWebUSB(): boolean {
  if (typeof navigator === "undefined") return false;
  return "usb" in navigator;
}

export function hasWebBluetooth(): boolean {
  if (typeof navigator === "undefined") return false;
  return "bluetooth" in navigator;
}

export function hasCameraScanning(): boolean {
  if (typeof navigator === "undefined") return false;
  return !!navigator.mediaDevices?.getUserMedia;
}

// ────────────────────────────────────────────────────────────────────────────
// ESC/POS receipt builder
// Produces a Uint8Array ready to be written to a thermal printer.
// ────────────────────────────────────────────────────────────────────────────

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const enc = (s: string) => new TextEncoder().encode(s);

function concat(parts: (Uint8Array | number[])[]): Uint8Array {
  const total = parts.reduce(
    (n, p) => n + (p as Uint8Array | number[]).length,
    0,
  );
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    const arr = p instanceof Uint8Array ? p : new Uint8Array(p);
    out.set(arr, off);
    off += arr.length;
  }
  return out;
}

export interface ReceiptLine {
  label: string;
  qty: number;
  amount: number;
}

export interface ReceiptPayload {
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  invoiceNumber: string;
  issuedAt?: string | Date | null;
  customerName?: string | null;
  customerPhone?: string | null;
  currency: string;
  lines: ReceiptLine[];
  subtotal?: number;
  discount?: number;
  taxAmount?: number;
  taxLabel?: string;
  total: number;
  paid?: number;
  balance?: number;
  footer?: string;
}

/** Build the byte stream to send to an ESC/POS printer. */
export function buildEscPosReceipt(
  payload: ReceiptPayload,
  paperWidth: PaperWidth = 80,
  options: { kickDrawer?: boolean } = {},
): Uint8Array {
  const cols = paperWidth === 58 ? 32 : 48;
  const fmt = (label: string, value: string) => {
    const v = value;
    const spaces = Math.max(1, cols - label.length - v.length);
    return label + " ".repeat(spaces) + v + "\n";
  };
  const sep = "-".repeat(cols) + "\n";

  const parts: (Uint8Array | number[])[] = [];

  // Init + UTF-8 codepage 16 (PC858) – safest default
  parts.push([ESC, 0x40]); // ESC @ – init
  parts.push([ESC, 0x74, 0x10]);

  // Centered + double height/width for shop name
  parts.push([ESC, 0x61, 0x01]); // center
  if (payload.shopName) {
    parts.push([GS, 0x21, 0x11]); // double width + height
    parts.push(enc(payload.shopName + "\n"));
    parts.push([GS, 0x21, 0x00]);
  }
  if (payload.shopAddress) parts.push(enc(payload.shopAddress + "\n"));
  if (payload.shopPhone) parts.push(enc(payload.shopPhone + "\n"));
  parts.push([LF]);

  // Left aligned body
  parts.push([ESC, 0x61, 0x00]);
  parts.push(enc(`Bill: ${payload.invoiceNumber}\n`));
  if (payload.issuedAt) {
    const d = new Date(payload.issuedAt);
    parts.push(enc(`Date: ${d.toLocaleString()}\n`));
  }
  if (payload.customerName)
    parts.push(enc(`Customer: ${payload.customerName}\n`));
  if (payload.customerPhone)
    parts.push(enc(`Phone: ${payload.customerPhone}\n`));
  parts.push(enc(sep));

  // Items
  for (const line of payload.lines) {
    const left = `${line.label} x${line.qty}`.slice(0, cols - 10);
    parts.push(enc(fmt(left, line.amount.toLocaleString())));
  }
  parts.push(enc(sep));

  if (payload.subtotal != null)
    parts.push(
      enc(fmt("Subtotal", `${payload.currency} ${payload.subtotal.toLocaleString()}`)),
    );
  if (payload.discount && payload.discount > 0)
    parts.push(
      enc(
        fmt(
          "Discount",
          `- ${payload.currency} ${payload.discount.toLocaleString()}`,
        ),
      ),
    );
  if (payload.taxAmount && payload.taxAmount > 0)
    parts.push(
      enc(
        fmt(
          payload.taxLabel ?? "Tax",
          `${payload.currency} ${payload.taxAmount.toLocaleString()}`,
        ),
      ),
    );

  // Total – emphasised
  parts.push([ESC, 0x45, 0x01]); // bold on
  parts.push(
    enc(fmt("TOTAL", `${payload.currency} ${payload.total.toLocaleString()}`)),
  );
  parts.push([ESC, 0x45, 0x00]); // bold off

  if (payload.paid != null)
    parts.push(
      enc(fmt("Paid", `${payload.currency} ${payload.paid.toLocaleString()}`)),
    );
  if (payload.balance && payload.balance > 0)
    parts.push(
      enc(
        fmt("Balance Due", `${payload.currency} ${payload.balance.toLocaleString()}`),
      ),
    );

  parts.push(enc(sep));
  parts.push([ESC, 0x61, 0x01]); // center
  parts.push(enc((payload.footer ?? "Thank you for your business!") + "\n"));
  parts.push(enc("Powered by Orivraa\n"));
  parts.push([LF, LF, LF, LF]);

  // Cut
  parts.push([GS, 0x56, 0x42, 0x00]); // partial cut with feed

  // Kick drawer if requested (ESC p m t1 t2) – pin 2, 50ms × 2
  if (options.kickDrawer) {
    parts.push([ESC, 0x70, 0x00, 0x32, 0x32]);
  }

  return concat(parts);
}

// ────────────────────────────────────────────────────────────────────────────
// Print transport
// ────────────────────────────────────────────────────────────────────────────

interface UsbInterface {
  interfaceNumber: number;
  alternates: { endpoints: { direction: string; endpointNumber: number }[] }[];
}
interface UsbConfiguration {
  interfaces: UsbInterface[];
}
interface UsbDevice {
  configuration: UsbConfiguration | null;
  productName?: string;
  serialNumber?: string;
  open: () => Promise<void>;
  selectConfiguration: (n: number) => Promise<void>;
  claimInterface: (n: number) => Promise<void>;
  transferOut: (endpoint: number, data: BufferSource) => Promise<unknown>;
  close: () => Promise<void>;
}
interface Usb {
  requestDevice: (opts: { filters: unknown[] }) => Promise<UsbDevice>;
  getDevices?: () => Promise<UsbDevice[]>;
}

declare global {
  interface Navigator {
    usb?: Usb;
  }
}

/**
 * Pair a USB receipt printer. Browser will show the picker.
 * Returns a label (product name + last 4 of serial) that we store in config.
 */
export async function pairUsbPrinter(): Promise<{
  device: UsbDevice;
  label: string;
} | null> {
  if (!navigator.usb) throw new Error("WebUSB not supported on this device");
  // Filter for common printer classes (vendor codes for Epson, Star, etc.)
  const device = await navigator.usb.requestDevice({
    filters: [
      { classCode: 7 }, // USB printer class
      { vendorId: 0x04b8 }, // Epson
      { vendorId: 0x0519 }, // Star Micronics
      { vendorId: 0x0fe6 }, // Generic ICS Advent (common 58mm)
      { vendorId: 0x0416 }, // Winbond / generic
    ],
  });
  await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  const iface = device.configuration?.interfaces?.[0];
  if (iface) await device.claimInterface(iface.interfaceNumber);
  const label =
    [device.productName, device.serialNumber?.slice(-4)]
      .filter(Boolean)
      .join(" ") || "USB Printer";
  return { device, label };
}

async function getPairedUsbPrinter(): Promise<UsbDevice | null> {
  if (!navigator.usb?.getDevices) return null;
  const devices = await navigator.usb.getDevices();
  return devices[0] ?? null;
}

/** Send raw ESC/POS bytes to the currently paired printer. */
export async function printReceiptBytes(bytes: Uint8Array): Promise<void> {
  const device = await getPairedUsbPrinter();
  if (!device) throw new Error("No paired USB printer. Pair one in Settings → Hardware.");
  if (!device.configuration) {
    await device.open();
    await device.selectConfiguration(1);
  }
  const iface = device.configuration?.interfaces?.[0];
  if (!iface) throw new Error("Printer has no usable interface");
  await device.claimInterface(iface.interfaceNumber);
  // Find first OUT endpoint
  const endpoint = iface.alternates[0]?.endpoints.find(
    (e) => e.direction === "out",
  );
  if (!endpoint) throw new Error("Printer has no OUT endpoint");
  await device.transferOut(endpoint.endpointNumber, bytes);
}

/** Convenience: build + print a receipt using the saved config. */
export async function printReceipt(
  payload: ReceiptPayload,
  opts: { kickDrawer?: boolean } = {},
): Promise<void> {
  const cfg = loadHardwareConfig();
  if (!cfg.printer.enabled || cfg.printer.transport === "none") {
    throw new Error("Printer not configured");
  }
  const bytes = buildEscPosReceipt(payload, cfg.printer.paperWidth, {
    kickDrawer: opts.kickDrawer ?? cfg.printer.kickCashDrawer,
  });
  if (cfg.printer.transport === "webusb") {
    await printReceiptBytes(bytes);
    return;
  }
  if (cfg.printer.transport === "network") {
    // The browser cannot open a raw TCP socket; this hands off to the API
    // which forwards the bytes to a local print agent. Backend route TBD –
    // for now we surface a clear error so the UI can guide the shopkeeper.
    throw new Error(
      "Network printing requires the Orivraa Desktop app or a local print agent.",
    );
  }
  if (cfg.printer.transport === "bluetooth") {
    throw new Error(
      "Bluetooth printing is supported in the Orivraa Desktop app.",
    );
  }
}

/** Send only a cash-drawer kick pulse through the printer. */
export async function kickCashDrawer(): Promise<void> {
  const bytes = new Uint8Array([ESC, 0x70, 0x00, 0x32, 0x32]);
  await printReceiptBytes(bytes);
}
