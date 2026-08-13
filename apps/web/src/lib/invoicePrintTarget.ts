import {
  listOsPrinters,
  loadHardwareConfig,
  type HardwareConfig,
  type PrinterTransport,
} from "./posHardware";

export type PrintMode = "thermal" | "system";

export interface DetectedPrinter {
  id: string;
  name: string;
  kind: PrintMode;
  source: "bluetooth" | "usb" | "network" | "saved" | "os";
  isDefault?: boolean;
}

export interface InvoicePrintTarget {
  mode: PrintMode;
  /** Short line under the Print button. */
  subtitle: string;
  deviceName: string;
  transport: PrinterTransport;
  detected: DetectedPrinter[];
  /** Windows/macOS spooler name when printing via Orivraa Desktop. */
  osPrinterName?: string;
}

const THERMAL_NAME =
  /seznik|minix|josh|pos[- ]?(58|80)|thermal|receipt|esc\s*pos|xprinter|gprinter|rongta|goojprt|mtp-3|inner.?printer|58\s*mm|80\s*mm|printer\s*d1|epson\s*tm|tm-t\d|star\s*tsp|citizen\s*ct|generic\s*\/\s*text\s*only/i;

const OFFICE_NAME =
  /hp\s|hewlett|laserjet|pixma|deskjet|officejet|envy|brother|mfc-|hl-\d|dcp-|xerox|lexmark|ricoh|kyocera|canon|epson\s*l\d|workforce|ecotank/i;

/** Cheap 58/80mm receipt units vs laser/inkjet office printers. */
export function looksLikeThermalPrinter(name: string): boolean {
  return THERMAL_NAME.test(String(name || ""));
}

export function looksLikeOfficePrinter(name: string): boolean {
  if (looksLikeThermalPrinter(name)) return false;
  return OFFICE_NAME.test(String(name || ""));
}

export function classifyPrinterName(
  name: string,
  fallback: PrintMode = "system",
): PrintMode {
  if (looksLikeThermalPrinter(name)) return "thermal";
  if (looksLikeOfficePrinter(name)) return "system";
  return fallback;
}

export function printerKindLabel(kind: PrintMode): string {
  return kind === "thermal" ? "Thermal receipt" : "A4 / office";
}

export function isRawThermalTransport(transport: PrinterTransport): boolean {
  return (
    transport === "bluetooth" ||
    transport === "webusb" ||
    transport === "network" ||
    transport === "os"
  );
}

export function paperWidthLabel(cfg: HardwareConfig): string {
  return cfg.printer.paperWidth === 58 ? "58mm" : "80mm";
}

function thermalFallbackName(transport: PrinterTransport): string {
  if (transport === "bluetooth") return "Wireless thermal";
  if (transport === "webusb") return "USB thermal";
  if (transport === "os") return "Installed thermal";
  return "Network thermal";
}

export function targetFromConfig(
  cfg: HardwareConfig,
  detected: DetectedPrinter[] = [],
): InvoicePrintTarget {
  const thermalConfigured =
    cfg.printer.enabled && isRawThermalTransport(cfg.printer.transport);
  const osThermal =
    detected.find((d) => d.kind === "thermal" && d.source === "os" && d.isDefault) ||
    detected.find((d) => d.kind === "thermal" && d.source === "os");

  if (thermalConfigured) {
    const match =
      detected.find((d) => d.kind === "thermal") || detected[0] || null;
    const name =
      cfg.printer.deviceLabel ||
      match?.name ||
      thermalFallbackName(cfg.printer.transport);
    return {
      mode: "thermal",
      subtitle: `Thermal receipt · ${paperWidthLabel(cfg)} · ${name}`,
      deviceName: name,
      transport: cfg.printer.transport,
      osPrinterName:
        cfg.printer.transport === "os"
          ? cfg.printer.deviceLabel || osThermal?.name
          : osThermal?.name,
      detected,
    };
  }

  if (osThermal) {
    return {
      mode: "thermal",
      subtitle: `Thermal receipt · ${paperWidthLabel(cfg)} · ${osThermal.name}`,
      deviceName: osThermal.name,
      transport: "os",
      osPrinterName: osThermal.name,
      detected,
    };
  }

  const office =
    detected.find((d) => d.kind === "system" && d.isDefault) ||
    detected.find((d) => d.kind === "system" && d.source === "os") ||
    detected.find((d) => d.kind === "system");
  return {
    mode: "system",
    subtitle: office
      ? `A4 / office printer · ${office.name}`
      : "A4 / office printer",
    deviceName: office?.name || "System printer",
    transport: cfg.printer.enabled ? cfg.printer.transport : "browser",
    detected,
  };
}

export async function listDetectedPrinters(): Promise<DetectedPrinter[]> {
  const found: DetectedPrinter[] = [];
  const cfg = loadHardwareConfig();

  if (cfg.printer.enabled && cfg.printer.deviceLabel) {
    found.push({
      id: `saved:${cfg.printer.transport}`,
      name: cfg.printer.deviceLabel,
      kind: isRawThermalTransport(cfg.printer.transport) ? "thermal" : "system",
      source: "saved",
    });
  }

  try {
    const osPrinters = await listOsPrinters();
    for (const printer of osPrinters) {
      const haystack = [printer.name, printer.driver, printer.port]
        .filter(Boolean)
        .join(" ");
      const kind = classifyPrinterName(haystack, "system");
      found.push({
        id: `os:${printer.name}`,
        name: printer.name,
        kind,
        source: "os",
        isDefault: printer.isDefault,
      });
    }
  } catch {
    /* not running inside Orivraa Desktop, or older app build */
  }

  try {
    const usb = navigator.usb?.getDevices
      ? await navigator.usb.getDevices()
      : [];
    for (const device of usb) {
      const usbDev = device as {
        productName?: string;
        serialNumber?: string;
        deviceClass?: number;
      };
      const name =
        [usbDev.productName, usbDev.serialNumber?.slice(-4)]
          .filter(Boolean)
          .join(" ") || "USB printer";
      const printerClass = usbDev.deviceClass === 7;
      const likelyThermal =
        printerClass || cfg.printer.transport === "webusb";
      const kind = classifyPrinterName(
        name,
        likelyThermal ? "thermal" : "system",
      );
      if (kind === "system" && !looksLikeOfficePrinter(name) && !printerClass) {
        continue;
      }
      found.push({
        id: `usb:${usbDev.serialNumber || name}`,
        name,
        kind,
        source: "usb",
      });
    }
  } catch {
    /* permission / unsupported */
  }

  try {
    const bluetooth = (
      navigator as Navigator & {
        bluetooth?: { getDevices?: () => Promise<BluetoothDevice[]> };
      }
    ).bluetooth;
    const devices = bluetooth?.getDevices ? await bluetooth.getDevices() : [];
    for (const device of devices) {
      const name = device.name || "";
      const savedBle =
        cfg.printer.transport === "bluetooth" &&
        !!cfg.printer.deviceLabel &&
        (!name ||
          name.toLowerCase() === cfg.printer.deviceLabel.toLowerCase());
      if (!looksLikeThermalPrinter(name) && !savedBle) continue;
      found.push({
        id: `ble:${device.id || name}`,
        name: name || cfg.printer.deviceLabel || "Wireless thermal",
        kind: "thermal",
        source: "bluetooth",
      });
    }
  } catch {
    /* permission / unsupported */
  }

  if (cfg.printer.transport === "network" && cfg.printer.host) {
    found.push({
      id: `net:${cfg.printer.host}:${cfg.printer.port || 9100}`,
      name: `${cfg.printer.host}:${cfg.printer.port || 9100}`,
      kind: "thermal",
      source: "network",
    });
  }

  const seen = new Set<string>();
  return found.filter((item) => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function resolveInvoicePrintTarget(): Promise<InvoicePrintTarget> {
  const cfg = loadHardwareConfig();
  const detected = await listDetectedPrinters();
  return targetFromConfig(cfg, detected);
}
