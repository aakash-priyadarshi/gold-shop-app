/**
 * POS Hardware abstraction layer for Orivraa shopkeepers.
 *
 * Supports:
 *   • Barcode scanners    – any HID keyboard-wedge scanner (USB or Bluetooth).
 *                            The browser sees rapid keystrokes ending in Enter,
 *                            so we just listen at the document level.
 *                            (Camera scanning lives in BarcodeScannerSheet.tsx
 *                             using BarcodeDetector or a ZXing fallback.)
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

export type PrinterTransport = "browser" | "webusb" | "bluetooth" | "network" | "os" | "none";
export type PaperWidth = 58 | 80;
export type LabelPrinterTransport = "web-serial" | "webusb" | "bluetooth" | "network" | "download";
export type LabelPrinterLanguage = "ZPL" | "TSPL" | "EPL" | "ESC_POS";

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
  /**
   * Seller explicitly chose A4 / office print. When true, Desktop must not
   * auto-pick an OS-listed thermal over that choice.
   */
  preferA4?: boolean;
}

/** Zebra / ZPL jewellery tag printer (Web Serial or .zpl download). */
export interface LabelPrinterConfig {
  enabled: boolean;
  transport: LabelPrinterTransport;
  language: LabelPrinterLanguage;
  /** Label width in millimetres (default ~50mm jewellery tag). */
  widthMm: number;
  /** Label height in millimetres (default ~25mm jewellery tag). */
  heightMm: number;
  /** Printer DPI — 203 (common) or 300. */
  dpi: 203 | 300;
  /** Baud rate for Web Serial (Zebra defaults to 9600). */
  baudRate?: number;
  deviceLabel?: string;
  host?: string;
  port?: number;
}

export interface HardwareConfig {
  scanner: ScannerConfig;
  printer: PrinterConfig;
  labelPrinter: LabelPrinterConfig;
}

const STORAGE_KEY = "orivraa.posHardware.v1";
/** Fired after hardware settings are saved so invoice Print can refresh. */
export const HARDWARE_CONFIG_CHANGED = "orivraa-hardware-changed";

export const defaultHardwareConfig: HardwareConfig = {
  scanner: {
    enabled: true,
    source: "keyboard-wedge",
    minLength: 4,
    maxIntervalMs: 80,
    autoAdd: true,
  },
  printer: {
    enabled: false,
    transport: "browser",
    paperWidth: 80,
    autoPrint: false,
    kickCashDrawer: false,
  },
  labelPrinter: {
    enabled: false,
    transport: "download",
    language: "ZPL",
    widthMm: 50,
    heightMm: 25,
    dpi: 203,
    baudRate: 9600,
    port: 9100,
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
      labelPrinter: {
        ...defaultHardwareConfig.labelPrinter,
        ...(parsed.labelPrinter ?? {}),
      },
    };
  } catch {
    return defaultHardwareConfig;
  }
}

export function saveHardwareConfig(cfg: HardwareConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new Event(HARDWARE_CONFIG_CHANGED));
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

/** Native BarcodeDetector is Chromium-only; iOS Safari uses the ZXing fallback. */
export function canOpenScanCamera(): boolean {
  return hasCameraScanning();
}

// ────────────────────────────────────────────────────────────────────────────
// ESC/POS receipt builder
// Produces a Uint8Array ready to be written to a thermal printer.
// ────────────────────────────────────────────────────────────────────────────

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const enc = (s: string) => new TextEncoder().encode(s);

function concat(parts: (Uint8Array | number[])[]): Uint8Array<ArrayBuffer> {
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
): Uint8Array<ArrayBuffer> {
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

// ────────────────────────────────────────────────────────────────────────────
// Web Bluetooth (SEZNIK Josh / MiniX / D1-compatible 58mm thermal)
// GATT write characteristic 0000ff02-… with D1 wake + ESC/POS chunked writes.
// Requires Chrome/Edge on HTTPS. Classic SPP is not available in browsers.
// ────────────────────────────────────────────────────────────────────────────

const BLE_WRITE_UUID = "0000ff02-0000-1000-8000-00805f9b34fb";
const BLE_SERVICE_CANDIDATES = [
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "000018f0-0000-1000-8000-00805f9b34fb",
];
const BLE_CHUNK = 512;

type BleDevice = BluetoothDevice;
let bleDeviceCache: BleDevice | null = null;
let bleWriteChar: BluetoothRemoteGATTCharacteristic | null = null;

function d1EnableSequence(): Uint8Array[] {
  return [
    new Uint8Array([0x10, 0xff, 0x40]),
    new Uint8Array([0x10, 0xff, 0xf1, 0x03]),
  ];
}

function d1EndSequence(): Uint8Array[] {
  return [
    new Uint8Array([0x1b, 0x4a, 0x64]),
    new Uint8Array([0x10, 0xff, 0xf1, 0x45]),
  ];
}

async function writeBleChunks(
  characteristic: BluetoothRemoteGATTCharacteristic,
  bytes: Uint8Array,
): Promise<void> {
  for (let i = 0; i < bytes.length; i += BLE_CHUNK) {
    const slice = bytes.slice(i, i + BLE_CHUNK);
    const buffer = slice.buffer.slice(
      slice.byteOffset,
      slice.byteOffset + slice.byteLength,
    ) as ArrayBuffer;
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(buffer);
    } else {
      await characteristic.writeValue(buffer);
    }
    // Small delay helps cheap BLE printers flush
    await new Promise((r) => setTimeout(r, 20));
  }
}

async function resolveWritableCharacteristic(
  server: BluetoothRemoteGATTServer,
): Promise<BluetoothRemoteGATTCharacteristic> {
  for (const serviceUuid of BLE_SERVICE_CANDIDATES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      try {
        return await service.getCharacteristic(BLE_WRITE_UUID);
      } catch {
        const chars = await service.getCharacteristics();
        const writable = chars.find(
          (c) =>
            c.properties.write ||
            c.properties.writeWithoutResponse,
        );
        if (writable) return writable;
      }
    } catch {
      // try next service
    }
  }

  // Last resort: scan all primary services for a writable characteristic
  const services = await server.getPrimaryServices();
  for (const service of services) {
    try {
      const chars = await service.getCharacteristics();
      const writable = chars.find(
        (c) => c.properties.write || c.properties.writeWithoutResponse,
      );
      if (writable) return writable;
    } catch {
      // continue
    }
  }
  throw new Error(
    "Could not find a writable BLE characteristic on this printer",
  );
}

/**
 * Pair a SEZNIK Josh / MiniX / D1-class Bluetooth thermal printer via Web Bluetooth.
 */
export async function pairBluetoothPrinter(): Promise<{
  device: BleDevice;
  label: string;
} | null> {
  if (!navigator.bluetooth) {
    throw new Error(
      "Web Bluetooth is not supported. Use Chrome or Edge on HTTPS.",
    );
  }

  let device: BleDevice;
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: "SEZNIK" },
        { namePrefix: "Seznik" },
        { namePrefix: "Josh" },
        { namePrefix: "D1" },
        { namePrefix: "MiniX" },
        { namePrefix: "Mini" },
        { namePrefix: "Printer" },
        { namePrefix: "MTP" },
      ],
      optionalServices: [
        ...BLE_SERVICE_CANDIDATES,
        "battery_service",
        "device_information",
      ],
    });
  } catch (err: any) {
    // User cancelled or filter matched nothing — offer acceptAllDevices
    if (err?.name === "NotFoundError" || err?.name === "NetworkError") {
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          ...BLE_SERVICE_CANDIDATES,
          "battery_service",
          "device_information",
        ],
      });
    } else {
      throw err;
    }
  }

  if (!device.gatt) throw new Error("Printer has no GATT server");
  const server = await device.gatt.connect();
  bleWriteChar = await resolveWritableCharacteristic(server);
  bleDeviceCache = device;
  const label = device.name || "Bluetooth Thermal Printer";
  return { device, label };
}

async function ensureBleConnection(): Promise<BluetoothRemoteGATTCharacteristic> {
  if (bleWriteChar && bleDeviceCache?.gatt?.connected) {
    return bleWriteChar;
  }
  if (bleDeviceCache?.gatt) {
    const server = await bleDeviceCache.gatt.connect();
    bleWriteChar = await resolveWritableCharacteristic(server);
    return bleWriteChar;
  }
  throw new Error(
    "No paired thermal printer. Pair one in Settings → Receipt printer.",
  );
}

/** Send raw ESC/POS (with D1 wake/end) over the paired BLE printer. */
export async function printBluetoothReceiptBytes(
  bytes: Uint8Array,
): Promise<void> {
  const characteristic = await ensureBleConnection();
  for (const cmd of d1EnableSequence()) {
    await writeBleChunks(characteristic, cmd);
  }
  await writeBleChunks(characteristic, bytes);
  for (const cmd of d1EndSequence()) {
    await writeBleChunks(characteristic, cmd);
  }
}

/** Send raw ESC/POS bytes to the currently paired printer. */
export async function printReceiptBytes(bytes: Uint8Array<ArrayBuffer>): Promise<void> {
  const device = await getPairedUsbPrinter();
  if (!device) throw new Error("No paired USB thermal printer. Pair one in Settings → Receipt printer.");
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

declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
      };
    };
  }
}

export function isTauriDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    window.__TAURI__?.core?.invoke ||
    (window as unknown as { __TAURI_INTERNALS__?: { invoke?: unknown } })
      .__TAURI_INTERNALS__?.invoke
  );
}

export function invokeTauri<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> | null {
  if (typeof window === "undefined") return null;
  const invoke =
    window.__TAURI__?.core?.invoke ??
    (
      window as unknown as {
        __TAURI_INTERNALS__?: {
          invoke?: <R>(cmd: string, args?: Record<string, unknown>) => Promise<R>;
        };
      }
    ).__TAURI_INTERNALS__?.invoke;
  if (!invoke) return null;
  return invoke<T>(command, args);
}

export interface OsPrinterInfo {
  name: string;
  driver?: string | null;
  port?: string | null;
  isDefault: boolean;
}

export async function listOsPrinters(): Promise<OsPrinterInfo[]> {
  const invoke = invokeTauri<OsPrinterInfo[]>("list_os_printers");
  if (!invoke) return [];
  try {
    const rows = await invoke;
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/** Send printer-language bytes unchanged to the currently paired BLE printer. */
export async function printBluetoothRawBytes(bytes: Uint8Array): Promise<void> {
  const characteristic = await ensureBleConnection();
  await writeBleChunks(characteristic, bytes);
}

function printHtml(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Universal route for OS-installed wired, Bluetooth, Wi-Fi and laser printers. */
export function printBrowserReceipt(payload: ReceiptPayload): void {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank", "width=420,height=760");
  if (!win) throw new Error("Popup blocked — allow popups to print receipts");
  const rows = payload.lines.map((line) => `<tr><td>${printHtml(line.label)}${line.qty > 1 ? ` × ${line.qty}` : ""}</td><td>${printHtml(`${payload.currency || ""} ${Number(line.amount).toFixed(2)}`)}</td></tr>`).join("");
  win.document.write(`<!doctype html><html><head><title>Receipt</title><style>@page{margin:7mm}body{font:12px Arial;margin:0;color:#111}h1{font-size:17px;margin:0 0 3px}p{margin:2px 0;color:#444}table{width:100%;border-collapse:collapse;margin:12px 0}td{padding:4px 0;border-bottom:1px solid #ddd}td:last-child{text-align:right}.total{font-size:16px;font-weight:700;text-align:right}</style></head><body><h1>${printHtml(payload.shopName)}</h1><p>${printHtml(payload.invoiceNumber)}</p><table>${rows}</table><div class="total">${printHtml(`${payload.currency || ""} ${Number(payload.total).toFixed(2)}`)}</div><script>window.onload=()=>setTimeout(()=>window.print(),100)</script></body></html>`);
  win.document.close();
}

/** Raw Wi-Fi/LAN printer transport is available only inside the desktop app. */
export async function printDesktopRawTcp(host: string | undefined, port: number | undefined, bytes: Uint8Array): Promise<void> {
  if (!host) throw new Error("Enter the printer's local network address");
  const invoke = invokeTauri<void>("send_raw_tcp_print", {
    host,
    port: Number(port) || 9100,
    data: Array.from(bytes),
  });
  if (!invoke) {
    throw new Error("Raw Wi-Fi printing requires Orivraa Desktop. Use A4 / office print for an OS-installed network printer.");
  }
  await invoke;
}

/** Send ESC/POS to a printer already installed in Windows / macOS (Desktop app). */
export async function printDesktopNamedPrinter(
  printerName: string | undefined,
  bytes: Uint8Array,
): Promise<void> {
  const name = String(printerName || "").trim();
  if (!name) throw new Error("No installed thermal printer selected");
  const invoke = invokeTauri<void>("send_raw_to_named_printer", {
    printerName: name,
    data: Array.from(bytes),
  });
  if (!invoke) {
    throw new Error("Printing to an installed printer requires the Orivraa Desktop app.");
  }
  await invoke;
}

export interface PrintReceiptOptions {
  kickDrawer?: boolean;
  /** Windows/macOS printer name from Devices and Printers (Desktop app). */
  osPrinterName?: string;
}

/** Convenience: build + print a receipt using the saved config. */
export async function printReceipt(
  payload: ReceiptPayload,
  opts: PrintReceiptOptions = {},
): Promise<void> {
  const cfg = loadHardwareConfig();
  const bytes = buildEscPosReceipt(payload, cfg.printer.paperWidth, {
    kickDrawer: opts.kickDrawer ?? cfg.printer.kickCashDrawer,
  });
  const osName =
    opts.osPrinterName ||
    (cfg.printer.transport === "os" ? cfg.printer.deviceLabel : undefined);
  if (osName && isTauriDesktop()) {
    await printDesktopNamedPrinter(osName, bytes);
    return;
  }
  if (!cfg.printer.enabled || cfg.printer.transport === "none") {
    throw new Error("Printer not configured");
  }
  if (cfg.printer.transport === "webusb") {
    await printReceiptBytes(bytes);
    return;
  }
  if (cfg.printer.transport === "network") {
    await printDesktopRawTcp(cfg.printer.host, cfg.printer.port, bytes);
    return;
  }
  if (cfg.printer.transport === "bluetooth") {
    await printBluetoothReceiptBytes(bytes);
    return;
  }
  if (cfg.printer.transport === "os") {
    await printDesktopNamedPrinter(cfg.printer.deviceLabel, bytes);
    return;
  }
  if (cfg.printer.transport === "browser") {
    printBrowserReceipt(payload);
    return;
  }
}

async function sendRawToConfiguredPrinter(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<void> {
  const cfg = loadHardwareConfig();
  if (cfg.printer.transport === "os" && isTauriDesktop()) {
    await printDesktopNamedPrinter(cfg.printer.deviceLabel, bytes);
    return;
  }
  if (cfg.printer.transport === "webusb") {
    await printReceiptBytes(bytes);
    return;
  }
  if (cfg.printer.transport === "network") {
    await printDesktopRawTcp(cfg.printer.host, cfg.printer.port, bytes);
    return;
  }
  if (cfg.printer.transport === "bluetooth") {
    await printBluetoothReceiptBytes(bytes);
    return;
  }
  throw new Error(
    "Cash drawer kick needs a paired thermal printer (USB, Bluetooth, Wi-Fi, or Desktop).",
  );
}

/** Send only a cash-drawer kick pulse through the configured printer. */
export async function kickCashDrawer(): Promise<void> {
  const bytes: Uint8Array<ArrayBuffer> = new Uint8Array([
    ESC, 0x70, 0x00, 0x32, 0x32,
  ]);
  await sendRawToConfiguredPrinter(bytes);
}

export type CashDrawerOpenResult =
  | { outcome: "opened" }
  | { outcome: "authorization_failed"; error: unknown }
  | { outcome: "hardware_failed"; error: unknown };

/**
 * Keep drawer authorization, physical hardware, and audit logging independent:
 * an audit outage must never make a successfully opened drawer look failed.
 */
export async function runCashDrawerOpenFlow({
  authorize,
  kick,
  audit,
  onAuditFailure,
}: {
  authorize: () => Promise<unknown>;
  kick: () => Promise<unknown>;
  audit: (success: boolean, error?: string) => Promise<unknown>;
  onAuditFailure?: (error: unknown) => void;
}): Promise<CashDrawerOpenResult> {
  try {
    await authorize();
  } catch (error) {
    return { outcome: "authorization_failed", error };
  }

  try {
    await kick();
  } catch (error: any) {
    void audit(false, error?.message || "Hardware kick failed").catch(
      onAuditFailure,
    );
    return { outcome: "hardware_failed", error };
  }

  void audit(true).catch(onAuditFailure);
  return { outcome: "opened" };
}

/**
 * Zebra / ZPL jewellery label printing (~50×25mm tag).
 * Uses Web Serial (Chrome/Edge) when configured; otherwise downloads a .zpl file
 * the shopkeeper can send to the printer via Zebra Setup Utilities / USB.
 */
export interface ZplLabelPayload {
  id?: string;
  sku: string;
  name: string;
  purity?: string;
  weightGrams?: number;
  price?: number;
  currency?: string;
  hallmark?: string;
  rfidCode?: string;
  shopName?: string;
}

function zplEscape(text: string): string {
  // ZPL Field Data: escape ^ and ~ which start commands
  return String(text ?? "")
    .replace(/\^/g, " ")
    .replace(/~/g, " ")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 48);
}

function mmToDots(mm: number, dpi: number): number {
  return Math.round((mm * dpi) / 25.4);
}

export function hasWebSerial(): boolean {
  if (typeof navigator === "undefined") return false;
  return "serial" in navigator;
}

/** Build a single-label ZPL (^XA … ^XZ) for a jewellery hang-tag. */
export function buildZplJewelleryLabel(
  payload: ZplLabelPayload,
  opts?: Partial<Pick<LabelPrinterConfig, "widthMm" | "heightMm" | "dpi">>,
): string {
  const cfg = loadHardwareConfig().labelPrinter;
  const widthMm = opts?.widthMm ?? cfg.widthMm ?? 50;
  const heightMm = opts?.heightMm ?? cfg.heightMm ?? 25;
  const dpi = opts?.dpi ?? cfg.dpi ?? 203;

  const pw = mmToDots(widthMm, dpi);
  const ll = mmToDots(heightMm, dpi);
  const sku = zplEscape(payload.sku || "SKU");
  const shop = zplEscape(payload.shopName || "Orivraa");
  const name = zplEscape(payload.name || "");
  const purity = zplEscape(payload.purity || "");
  const weight =
    payload.weightGrams != null && Number.isFinite(payload.weightGrams)
      ? `${Number(payload.weightGrams).toFixed(2)}g`
      : "";
  const price =
    payload.price != null && Number.isFinite(payload.price)
      ? `${payload.currency || ""} ${Number(payload.price).toLocaleString("en-IN", {
          maximumFractionDigits: 0,
        })}`.trim()
      : "";
  const meta = [purity, weight].filter(Boolean).join("  ");
  const hallmark = payload.hallmark ? zplEscape(payload.hallmark) : "";
  const rfid = payload.rfidCode ? zplEscape(payload.rfidCode) : "";
  const qrPayload = zplEscape(payload.id ? `orivraa:inventory:${payload.id}` : payload.sku);

  // Layout tuned for ~50×25mm at 203dpi (≈400×200 dots).
  // Code128 barcode on SKU; human-readable fields for counter staff.
  const lines = [
    "^XA",
    "^CI28", // UTF-8
    `^PW${pw}`,
    `^LL${ll}`,
    "^LH0,0",
    "^LT0",
    // Shop name
    `^FO20,12^A0N,18,18^FD${shop}^FS`,
    // Product name
    `^FO20,34^A0N,22,22^FD${name}^FS`,
    // Purity + weight
    meta ? `^FO20,60^A0N,18,18^FD${zplEscape(meta)}^FS` : "",
    // Price
    price ? `^FO20,82^A0N,22,22^FD${zplEscape(price)}^FS` : "",
    // Code128 barcode (SKU) — height ~40 dots
    `^FO${Math.max(pw - 104, 260)},18^BQN,2,4^FDLA,${qrPayload}^FS`,
    `^FO20,108^BY1.5,2,40^BCN,40,Y,N,N^FD${sku}^FS`,
    // Hallmark / HUID if present
    hallmark ? `^FO20,168^A0N,14,14^FD${hallmark}^FS` : "",
    rfid ? `^FO20,184^A0N,12,12^FDRFID ${rfid}^FS` : "",
    "^XZ",
  ].filter(Boolean);

  return lines.join("\n");
}

function downloadZplFile(zpl: string, sku: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([zpl], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `label-${(sku || "tag").replace(/[^\w.-]+/g, "_").slice(0, 40)}.zpl`;
  a.click();
  URL.revokeObjectURL(url);
}

let labelSerialPort: any = null;

/**
 * Pair / open a Zebra (or compatible) label printer over Web Serial.
 * Returns a short device label for settings UI.
 */
export async function pairLabelSerialPrinter(
  baudRate = 9600,
): Promise<{ label: string }> {
  if (!hasWebSerial()) {
    throw new Error("Web Serial is not supported. Use Chrome or Edge, or switch to Download .zpl.");
  }
  const port = await (navigator as any).serial.requestPort({ filters: [] });
  await port.open({
    baudRate,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    flowControl: "none",
  });
  labelSerialPort = port;
  const info = port.getInfo?.() ?? {};
  const label = info.usbVendorId
    ? `Serial (${info.usbVendorId}:${info.usbProductId ?? "?"})`
    : "Serial label printer";
  return { label };
}

async function writeZplToSerial(zpl: string, baudRate = 9600): Promise<void> {
  if (!hasWebSerial()) {
    throw new Error("Web Serial not available");
  }

  let port = labelSerialPort;
  if (!port) {
    // Re-request / use previously granted port
    const ports = await (navigator as any).serial.getPorts?.();
    port = ports?.[0] ?? null;
    if (!port) {
      const paired = await pairLabelSerialPrinter(baudRate);
      void paired;
      port = labelSerialPort;
    } else {
      if (!port.readable && !port.writable) {
        await port.open({
          baudRate,
          dataBits: 8,
          stopBits: 1,
          parity: "none",
          flowControl: "none",
        });
      }
      labelSerialPort = port;
    }
  }

  if (!port?.writable) {
    throw new Error("Label printer serial port is not writable");
  }

  const writer = port.writable.getWriter();
  try {
    await writer.write(new TextEncoder().encode(zpl));
  } finally {
    writer.releaseLock();
  }
}

function rawLabelText(value: unknown, max = 64): string {
  return String(value ?? "").replace(/[\r\n"']/g, " ").slice(0, max);
}

function tagPayload(payload: ZplLabelPayload): string {
  return payload.id ? `orivraa:inventory:${payload.id}` : payload.sku;
}

function buildTsplLabel(payload: ZplLabelPayload, cfg: LabelPrinterConfig): string {
  return [
    `SIZE ${cfg.widthMm} mm,${cfg.heightMm} mm`, "GAP 2 mm,0", "CLS",
    `TEXT 16,12,\"0\",0,1,1,\"${rawLabelText(payload.shopName || "Orivraa", 24)}\"`,
    `TEXT 16,34,\"0\",0,1,1,\"${rawLabelText(payload.name, 28)}\"`,
    `QRCODE 300,12,L,4,A,0,M2,S7,\"${rawLabelText(tagPayload(payload), 120)}\"`,
    `BARCODE 16,62,\"128\",42,1,0,2,2,\"${rawLabelText(payload.sku, 32)}\"`,
    "PRINT 1,1",
  ].join("\n");
}

function buildEplLabel(payload: ZplLabelPayload, cfg: LabelPrinterConfig): string {
  const width = mmToDots(cfg.widthMm, cfg.dpi);
  const height = mmToDots(cfg.heightMm, cfg.dpi);
  return [
    "N", `q${width}`, `Q${height},24`,
    `A16,12,0,2,1,1,N,\"${rawLabelText(payload.shopName || "Orivraa", 24)}\"`,
    `A16,36,0,2,1,1,N,\"${rawLabelText(payload.name, 28)}\"`,
    `b${Math.max(width - 112, 220)},12,Q,2,4,M,0,\"${rawLabelText(tagPayload(payload), 100)}\"`,
    `B16,64,0,1,2,3,44,B,\"${rawLabelText(payload.sku, 32)}\"`, "P1",
  ].join("\n");
}

function buildRawLabel(payload: ZplLabelPayload, cfg: LabelPrinterConfig): Uint8Array {
  if (cfg.language === "ESC_POS") {
    return buildEscPosReceipt({
      shopName: payload.shopName || "Orivraa", invoiceNumber: payload.sku,
      issuedAt: new Date(), currency: payload.currency || "",
      lines: [{ label: payload.name, qty: 1, amount: payload.price ?? 0 }, { label: `QR: ${tagPayload(payload)}`, qty: 1, amount: 0 }],
      subtotal: payload.price ?? 0, total: payload.price ?? 0,
    }, 58);
  }
  const command = cfg.language === "TSPL" ? buildTsplLabel(payload, cfg)
    : cfg.language === "EPL" ? buildEplLabel(payload, cfg)
      : buildZplJewelleryLabel(payload, cfg);
  return new TextEncoder().encode(command);
}

function downloadRawLabel(bytes: Uint8Array, sku: string, language: LabelPrinterLanguage): void {
  if (typeof window === "undefined") return;
  const ext = { ZPL: "zpl", TSPL: "tspl", EPL: "epl", ESC_POS: "bin" }[language];
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/octet-stream" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `label-${(sku || "tag").replace(/[^\w.-]+/g, "_").slice(0, 40)}.${ext}`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Send a configured ZPL/TSPL/EPL/ESC-POS tag through the selected transport. */
export async function printJewelleryLabel(payload: ZplLabelPayload): Promise<{ method: LabelPrinterTransport }> {
  const cfg = loadHardwareConfig().labelPrinter;
  const bytes = buildRawLabel(payload, cfg);
  if (cfg.transport === "web-serial") {
    try {
      await writeZplToSerial(new TextDecoder().decode(bytes), cfg.baudRate ?? 9600);
      return { method: "web-serial" };
    } catch (error) {
      console.warn("Serial label print failed; downloading label command", error);
      downloadRawLabel(bytes, payload.sku, cfg.language);
      return { method: "download" };
    }
  }
  if (cfg.transport === "webusb") {
    await printReceiptBytes(bytes as Uint8Array<ArrayBuffer>);
    return { method: "webusb" };
  }
  if (cfg.transport === "bluetooth") {
    await printBluetoothRawBytes(bytes);
    return { method: "bluetooth" };
  }
  if (cfg.transport === "network") {
    await printDesktopRawTcp(cfg.host, cfg.port, bytes);
    return { method: "network" };
  }
  downloadRawLabel(bytes, payload.sku, cfg.language);
  return { method: "download" };
}

/**
 * Print a jewellery tag via ZPL.
 * - transport `web-serial`: send over Web Serial (Chrome)
 * - transport `download` (or serial unavailable): download .zpl file
 */
export async function printZplJewelleryLabel(
  payload: ZplLabelPayload,
): Promise<{ method: "web-serial" | "download" }> {
  const cfg = loadHardwareConfig().labelPrinter;
  const zpl = buildZplJewelleryLabel(payload, {
    widthMm: cfg.widthMm,
    heightMm: cfg.heightMm,
    dpi: cfg.dpi,
  });

  const preferSerial = cfg.transport === "web-serial" && hasWebSerial();
  if (preferSerial) {
    try {
      await writeZplToSerial(zpl, cfg.baudRate ?? 9600);
      return { method: "web-serial" };
    } catch (err) {
      // Fall through to download so the shopkeeper is never blocked
      console.warn("ZPL serial print failed, falling back to download:", err);
    }
  }

  downloadZplFile(zpl, payload.sku);
  return { method: "download" };
}
