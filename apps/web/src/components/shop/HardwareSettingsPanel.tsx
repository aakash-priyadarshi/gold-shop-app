"use client";

import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { SettingsSaveStatus } from "@/components/settings/SettingsSaveStatus";
import { T } from "@/components/ui/T";
import { useToast } from "@/hooks/use-toast";
import {
    defaultHardwareConfig,
    hasCameraScanning,
    hasWebBluetooth,
    hasWebSerial,
    hasWebUSB,
    isTauriDesktop,
    kickCashDrawer,
    loadHardwareConfig,
    pairBluetoothPrinter,
    pairLabelSerialPrinter,
    pairUsbPrinter,
    printJewelleryLabel,
    printReceipt,
    saveHardwareConfig,
    type HardwareConfig,
    type LabelPrinterTransport,
    type PaperWidth,
    type PrinterTransport,
    type ScannerSource,
} from "@/lib/posHardware";
import {
    listDetectedPrinters,
    type DetectedPrinter,
} from "@/lib/invoicePrintTarget";
import {
    ArrowLeft,
    Bluetooth,
    Camera,
    Check,
    Download,
    Keyboard,
    Loader2,
    Monitor,
    Printer,
    ScanLine,
    Tag,
    Usb,
    Wifi,
    Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AutoSaveStatus } from "@/hooks/use-auto-save";

export type HardwareSettingsPanelProps = {
  /** Where the back arrow returns (mobile vs desktop settings). */
  backHref?: string;
  /** Hide mobile-only help chrome on desktop dashboard. */
  showMobileHelp?: boolean;
};

const TRANSPORTS: {
  id: PrinterTransport;
  label: string;
  Icon: React.ElementType;
  hint: string;
  available: () => boolean;
}[] = [
  {
    id: "none",
    label: "Disabled",
    Icon: Printer,
    hint: "No receipt printing",
    available: () => true,
  },
  {
    id: "browser",
    label: "A4 / office printer",
    Icon: Printer,
    hint: "Wi-Fi, USB, or Bluetooth printers already installed on this computer",
    available: () => true,
  },
  {
    id: "webusb",
    label: "USB thermal receipt",
    Icon: Usb,
    hint: "58/80mm roll printer over USB (Epson TM, Star, generic POS)",
    available: () => hasWebUSB(),
  },
  {
    id: "bluetooth",
    label: "Wireless thermal receipt",
    Icon: Bluetooth,
    hint: "58/80mm roll (SEZNIK Josh / MiniX) — not an A4 office printer",
    available: () => hasWebBluetooth(),
  },
  {
    id: "os",
    label: "Installed thermal (Desktop)",
    Icon: Monitor,
    hint: "58/80mm printer already in Windows / macOS Devices and Printers",
    available: () => isTauriDesktop(),
  },
  {
    id: "network",
    label: "Wi-Fi thermal (raw)",
    Icon: Wifi,
    hint: "58/80mm ESC/POS over TCP 9100 — Orivraa Desktop app",
    available: () => isTauriDesktop(),
  },
];

const SCANNER_SOURCES: {
  id: ScannerSource;
  label: string;
  Icon: React.ElementType;
  hint: string;
  available: () => boolean;
}[] = [
  {
    id: "keyboard-wedge",
    label: "USB / Bluetooth scanner",
    Icon: ScanLine,
    hint: "Any HID keyboard-wedge scanner – just plug it in or pair via OS",
    available: () => true,
  },
  {
    id: "camera",
    label: "Phone camera",
    Icon: Camera,
    hint: "Uses the back camera for barcodes, QR, and Data Matrix. RFID/EPC needs a USB or Bluetooth gun.",
    available: () => hasCameraScanning(),
  },
  {
    id: "manual",
    label: "Manual entry",
    Icon: Keyboard,
    hint: "Type or paste the SKU",
    available: () => true,
  },
];

export default function HardwareSettingsPanel({
  backHref = "/m/settings",
  showMobileHelp = true,
}: HardwareSettingsPanelProps) {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<HardwareConfig>(defaultHardwareConfig);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>("idle");
  const saveStatusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pairing, setPairing] = useState(false);
  const [pairingLabel, setPairingLabel] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingLabel, setTestingLabel] = useState(false);
  const [detected, setDetected] = useState<DetectedPrinter[]>([]);

  useEffect(() => {
    setCfg(loadHardwareConfig());
    setLoaded(true);
    void listDetectedPrinters().then(setDetected);
  }, []);

  useEffect(
    () => () => {
      if (saveStatusTimeout.current) clearTimeout(saveStatusTimeout.current);
    },
    [],
  );

  const markAutoSaved = () => {
    setSaveStatus("saved");
    if (saveStatusTimeout.current) clearTimeout(saveStatusTimeout.current);
    saveStatusTimeout.current = setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const persistConfig = (next: HardwareConfig) => {
    saveHardwareConfig(next);
    markAutoSaved();
  };

  const updateScanner = (patch: Partial<HardwareConfig["scanner"]>) => {
    const next = { ...cfg, scanner: { ...cfg.scanner, ...patch } };
    setCfg(next);
    persistConfig(next);
  };
  const updatePrinter = (patch: Partial<HardwareConfig["printer"]>) => {
    const next = { ...cfg, printer: { ...cfg.printer, ...patch } };
    setCfg(next);
    persistConfig(next);
  };
  const updateLabelPrinter = (
    patch: Partial<HardwareConfig["labelPrinter"]>,
  ) => {
    const next = {
      ...cfg,
      labelPrinter: { ...cfg.labelPrinter, ...patch },
    };
    setCfg(next);
    persistConfig(next);
  };

  const handlePair = async () => {
    setPairing(true);
    try {
      if (cfg.printer.transport === "bluetooth") {
        const result = await pairBluetoothPrinter();
        if (result) {
          updatePrinter({
            enabled: true,
            transport: "bluetooth",
            deviceLabel: result.label,
          });
          toast({
            title: "Thermal printer paired",
            description: result.label,
          });
          void listDetectedPrinters().then(setDetected);
        }
        return;
      }
      const result = await pairUsbPrinter();
      if (result) {
        updatePrinter({
          enabled: true,
          transport: "webusb",
          deviceLabel: result.label,
        });
        toast({
          title: "USB thermal paired",
          description: result.label,
        });
        void listDetectedPrinters().then(setDetected);
      }
    } catch (e: any) {
      toast({
        title: "Pairing failed",
        description: e?.message ?? "Could not pair printer",
        variant: "destructive",
      });
    } finally {
      setPairing(false);
    }
  };

  const handleTestPrint = async () => {
    setTesting(true);
    try {
      saveHardwareConfig(cfg);
      await printReceipt({
        shopName: "Orivraa Test Receipt",
        shopPhone: "Hardware self-test",
        invoiceNumber: "TEST-001",
        issuedAt: new Date(),
        currency: "LKR",
        lines: [
          { label: "Test Item 1", qty: 1, amount: 100 },
          { label: "Test Item 2", qty: 2, amount: 250 },
        ],
        subtotal: 350,
        total: 350,
      });
      toast({ title: "Test receipt sent" });
    } catch (e: any) {
      toast({
        title: "Print failed",
        description: e?.message ?? "Check printer connection",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleKickDrawer = async () => {
    try {
      await kickCashDrawer();
      toast({ title: "Drawer kick sent" });
    } catch (e: any) {
      toast({
        title: "Drawer kick failed",
        description: e?.message ?? "Printer not connected",
        variant: "destructive",
      });
    }
  };

  const handlePairLabel = async () => {
    setPairingLabel(true);
    try {
      const result = cfg.labelPrinter.transport === "webusb"
        ? await pairUsbPrinter()
        : cfg.labelPrinter.transport === "bluetooth"
          ? await pairBluetoothPrinter()
          : await pairLabelSerialPrinter(cfg.labelPrinter.baudRate ?? 9600);
      if (!result) return;
      updateLabelPrinter({
        enabled: true,
        transport: cfg.labelPrinter.transport,
        deviceLabel: result.label,
      });
      toast({ title: "Label printer paired", description: result.label });
    } catch (e: any) {
      toast({
        title: "Label pairing failed",
        description: e?.message ?? "Could not open serial port",
        variant: "destructive",
      });
    } finally {
      setPairingLabel(false);
    }
  };

  const handleTestLabel = async () => {
    setTestingLabel(true);
    try {
      // Persist current form values first so the test uses them
      saveHardwareConfig(cfg);
      const result = await printJewelleryLabel({
        id: "a1c00000-0000-4000-8000-000000000001",
        sku: "TEST-SKU-001",
        name: "18K Gold Ring",
        purity: "18K",
        weightGrams: 3.25,
        price: 12500,
        currency: "LKR",
        shopName: "Orivraa Test",
        hallmark: "HUID-TEST",
      });
      toast({
        title:
          result.method === "download" ? "Test label file downloaded" : "Test label sent to printer",
        description:
          result.method === "download"
            ? "Send the downloaded command file with your printer utility"
            : undefined,
      });
    } catch (e: any) {
      toast({
        title: "Label test failed",
        description: e?.message ?? "Check label printer connection",
        variant: "destructive",
      });
    } finally {
      setTestingLabel(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-3 pb-3">
        <div className="flex items-center justify-between">
          <Link
            href={backHref}
            className="p-2 -ml-2 rounded-xl text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-center flex-1">
            <h1 className="text-base font-bold text-gray-900">
              <T>POS Hardware</T>
            </h1>
            <p className="text-[11px] text-gray-400">
              <T>Barcode scanner · Receipt printer · Label printer · Cash drawer</T>
            </p>
          </div>
          {showMobileHelp ? (
          <MobileHelpButton
            title="POS Hardware"
            description="Connect a barcode scanner, thermal receipt printer and cash drawer to your phone or tablet."
            tips={[
              "Any USB or Bluetooth scanner that types like a keyboard works without setup",
              "USB thermal printers (Epson TM, Star, generic 58/80mm) work directly from Chrome / Edge",
              "Wireless thermal receipt (SEZNIK Josh / MiniX): pick Wireless thermal receipt, tap Pair thermal, then Test",
              "Zebra jewellery tags: enable Label printer and use Web Serial (Chrome) or download a .zpl file",
              "Network receipt printers need the Orivraa Desktop app or a local print agent",
              "Wi-Fi / USB / Bluetooth printers already installed in Windows appear in Print on the invoice page",
            ]}
          />
          ) : (
            <span className="w-9" aria-hidden />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Scanner section */}
        <section
          className="bg-white rounded-2xl border border-gray-100 p-4"
          data-tour="hardware-scanner"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-amber-600" />
              <h2 className="text-sm font-bold text-gray-900">
                <T>Barcode scanner</T>
              </h2>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={cfg.scanner.enabled}
                onChange={(e) => updateScanner({ enabled: e.target.checked })}
                className="h-4 w-4 accent-amber-500"
              />
              <T>Enabled</T>
            </label>
          </div>

          <p className="text-[11px] text-gray-500 mb-3">
            <T>Default input method when you open the scanner dialog.</T>
          </p>

          <div className="grid grid-cols-1 gap-2 mb-3">
            {SCANNER_SOURCES.map((s) => {
              const active = cfg.scanner.source === s.id;
              const disabled = !s.available();
              const Icon = s.Icon;
              return (
                <button
                  key={s.id}
                  onClick={() => updateScanner({ source: s.id })}
                  disabled={disabled}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${
                    active
                      ? "border-amber-400 bg-amber-50"
                      : "border-gray-200 bg-white"
                  } ${disabled ? "opacity-40" : ""}`}
                >
                  <Icon
                    className={`h-5 w-5 mt-0.5 ${active ? "text-amber-600" : "text-gray-500"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {s.label}
                    </p>
                    <p className="text-[11px] text-gray-500">{s.hint}</p>
                  </div>
                  {active && <Check className="h-4 w-4 text-amber-600" />}
                </button>
              );
            })}
          </div>

          <label className="flex items-center justify-between text-xs">
            <span className="text-gray-700">
              <T>Auto-add scanned items to cart</T>
            </span>
            <input
              type="checkbox"
              checked={cfg.scanner.autoAdd}
              onChange={(e) => updateScanner({ autoAdd: e.target.checked })}
              className="h-4 w-4 accent-amber-500"
            />
          </label>
        </section>

        {/* Printer section */}
        <section
          className="bg-white rounded-2xl border border-gray-100 p-4"
          data-tour="hardware-receipt-printer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-amber-600" />
              <h2 className="text-sm font-bold text-gray-900">
                <T>Receipt printer</T>
              </h2>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={cfg.printer.enabled}
                onChange={(e) => updatePrinter({ enabled: e.target.checked })}
                className="h-4 w-4 accent-amber-500"
              />
              <T>Enabled</T>
            </label>
          </div>
          <p className="text-[11px] text-gray-500 mb-3">
            <T>
              Thermal receipt = 58/80mm roll (SEZNIK, Epson TM). A4 / office =
              printers already installed on this computer. Print on the invoice
              picks the connected one automatically.
            </T>
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {TRANSPORTS.map((t) => {
              const active = cfg.printer.transport === t.id;
              const disabled = !t.available();
              const Icon = t.Icon;
              return (
                <button
                  key={t.id}
                  onClick={() =>
                    updatePrinter({ transport: t.id, preferA4: false })
                  }
                  disabled={disabled}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-colors ${
                    active
                      ? "border-amber-400 bg-amber-50"
                      : "border-gray-200 bg-white"
                  } ${disabled ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon
                      className={`h-4 w-4 ${active ? "text-amber-600" : "text-gray-500"}`}
                    />
                    <span className="text-sm font-semibold text-gray-900 flex-1">
                      {t.label}
                    </span>
                    {active && (
                      <Check className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 leading-tight">
                    {t.hint}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Paper width */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-700">
              <T>Paper width</T>
            </span>
            <div className="flex gap-2">
              {([58, 80] as PaperWidth[]).map((w) => (
                <button
                  key={w}
                  onClick={() => updatePrinter({ paperWidth: w })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    cfg.printer.paperWidth === w
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {w}mm
                </button>
              ))}
            </div>
          </div>

          {/* Paired device label */}
          {cfg.printer.deviceLabel && (
            <p className="text-[11px] text-gray-500 mb-3">
              <T>Paired thermal</T>:{" "}
              <span className="text-gray-700 font-medium">
                {cfg.printer.deviceLabel}
              </span>
            </p>
          )}
          {detected.length > 0 ? (
            <div
              className="mb-3 rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-1.5"
              data-tour="hardware-detected"
            >
              <p className="text-[11px] font-semibold text-gray-700">
                <T>Detected on this device</T>
              </p>
              {isTauriDesktop() ? (
                <p className="text-[10px] text-gray-500">
                  <T>
                    Names come from Windows / macOS Devices and Printers via
                    Orivraa Desktop. Tap a thermal to use it for receipts.
                  </T>
                </p>
              ) : (
                <p className="text-[10px] text-gray-500">
                  <T>
                    Browser can only see paired thermals. Open this page in the
                    Orivraa Desktop app to list every printer installed on this
                    PC.
                  </T>
                </p>
              )}
              {detected.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    const printer =
                      item.kind === "thermal"
                        ? {
                            ...cfg.printer,
                            enabled: true,
                            preferA4: false,
                            transport:
                              item.source === "os"
                                ? ("os" as const)
                                : item.source === "usb"
                                  ? ("webusb" as const)
                                  : item.source === "bluetooth"
                                    ? ("bluetooth" as const)
                                    : item.source === "network"
                                      ? ("network" as const)
                                      : cfg.printer.transport,
                            deviceLabel: item.name,
                          }
                        : {
                            ...cfg.printer,
                            transport: "browser" as const,
                            preferA4: true,
                          };
                    const next = { ...cfg, printer };
                    setCfg(next);
                    persistConfig(next);
                    toast({
                      title:
                        item.kind === "thermal"
                          ? "Thermal receipt selected"
                          : "A4 / office selected",
                      description: item.name,
                    });
                  }}
                  className="w-full text-[11px] text-gray-600 flex justify-between gap-2 text-left hover:text-gray-900"
                >
                  <span>
                    {item.name}
                    {item.isDefault ? " (default)" : ""}
                  </span>
                  <span className="text-amber-700 font-medium shrink-0">
                    {item.kind === "thermal" ? (
                      <T>Thermal receipt</T>
                    ) : (
                      <T>A4 / office</T>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p
              className="text-[11px] text-gray-500 mb-3"
              data-tour="hardware-detected"
            >
              {isTauriDesktop() ? (
                <T>
                  No printers found on this computer yet. Install a printer in
                  Windows, then return here. Invoice Print will use the A4 /
                  office dialog until a thermal is listed.
                </T>
              ) : (
                <T>
                  No thermal printer detected here. Invoice Print will use the
                  A4 / office dialog. Use the Orivraa Desktop app to list
                  printers installed on this PC.
                </T>
              )}
            </p>
          )}

          {/* Network host/port */}
          {cfg.printer.transport === "network" && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <input
                placeholder="192.168.1.100"
                value={cfg.printer.host ?? ""}
                onChange={(e) => updatePrinter({ host: e.target.value })}
                className="col-span-2 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                type="number"
                placeholder="9100"
                value={cfg.printer.port ?? ""}
                onChange={(e) =>
                  updatePrinter({ port: Number(e.target.value) || undefined })
                }
                className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          )}

          {/* Toggles */}
          <label className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-700">
              <T>Auto-print receipt after bill</T>
            </span>
            <input
              type="checkbox"
              checked={cfg.printer.autoPrint}
              onChange={(e) => updatePrinter({ autoPrint: e.target.checked })}
              className="h-4 w-4 accent-amber-500"
            />
          </label>
          <label className="flex items-center justify-between text-xs mb-3">
            <span className="text-gray-700">
              <T>Open cash drawer on cash payments</T>
            </span>
            <input
              type="checkbox"
              checked={cfg.printer.kickCashDrawer}
              onChange={(e) =>
                updatePrinter({ kickCashDrawer: e.target.checked })
              }
              className="h-4 w-4 accent-amber-500"
            />
          </label>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handlePair}
              disabled={
                pairing ||
                (cfg.printer.transport !== "webusb" &&
                  cfg.printer.transport !== "bluetooth")
              }
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 text-amber-800 text-xs font-semibold disabled:opacity-40"
            >
              {pairing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : cfg.printer.transport === "bluetooth" ? (
                <Bluetooth className="h-3.5 w-3.5" />
              ) : (
                <Usb className="h-3.5 w-3.5" />
              )}
              <T>
                {cfg.printer.transport === "bluetooth"
                  ? "Pair thermal"
                  : "Pair USB"}
              </T>
            </button>
            <button
              onClick={handleTestPrint}
              disabled={testing || !cfg.printer.enabled}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold disabled:opacity-40"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5" />
              )}
              <T>Test</T>
            </button>
            <button
              onClick={handleKickDrawer}
              disabled={!cfg.printer.enabled}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold disabled:opacity-40"
            >
              <Wrench className="h-3.5 w-3.5" />
              <T>Kick</T>
            </button>
          </div>
        </section>

        {/* Label printer (ZPL / Zebra) */}
        <section
          className="bg-white rounded-2xl border border-gray-100 p-4"
          data-tour="hardware-label-printer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-amber-600" />
              <h2 className="text-sm font-bold text-gray-900">
                <T>Jewellery label printer</T>
              </h2>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={cfg.labelPrinter.enabled}
                onChange={(e) =>
                  updateLabelPrinter({ enabled: e.target.checked })
                }
                className="h-4 w-4 accent-amber-500"
              />
              <T>Enabled</T>
            </label>
          </div>

          <p className="text-[11px] text-gray-500 mb-3">
            <T>
              When enabled, Stock → Print Tag sends ZPL to a Zebra (or compatible)
              printer. Otherwise the browser printable tag sheet is used.
            </T>
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {(
              [
                {
                  id: "web-serial" as LabelPrinterTransport,
                  label: "Web Serial",
                  Icon: Usb,
                  hint: "USB Zebra over Chrome / Edge serial",
                  available: hasWebSerial(),
                },
                {
                  id: "webusb" as LabelPrinterTransport,
                  label: "WebUSB",
                  Icon: Usb,
                  hint: "Direct USB thermal/label printer",
                  available: hasWebUSB(),
                },
                {
                  id: "bluetooth" as LabelPrinterTransport,
                  label: "Wireless thermal",
                  Icon: Bluetooth,
                  hint: "58/80mm roll or label printer — not an A4 office printer",
                  available: hasWebBluetooth(),
                },
                {
                  id: "network" as LabelPrinterTransport,
                  label: "Wi-Fi / LAN",
                  Icon: Wifi,
                  hint: "Raw TCP 9100 through Orivraa Desktop",
                  available: true,
                },
                {
                  id: "download" as LabelPrinterTransport,
                  label: "Download command file",
                  Icon: Download,
                  hint: "Use any vendor utility or installed driver",
                  available: true,
                },
              ] as const
            ).map((t) => {
              const active = cfg.labelPrinter.transport === t.id;
              const Icon = t.Icon;
              return (
                <button
                  key={t.id}
                  onClick={() => updateLabelPrinter({ transport: t.id })}
                  disabled={!t.available}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-colors ${
                    active
                      ? "border-amber-400 bg-amber-50"
                      : "border-gray-200 bg-white"
                  } ${!t.available ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon
                      className={`h-4 w-4 ${active ? "text-amber-600" : "text-gray-500"}`}
                    />
                    <span className="text-sm font-semibold text-gray-900 flex-1">
                      {t.label}
                    </span>
                    {active && (
                      <Check className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 leading-tight">
                    {t.hint}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <label className="text-[11px] text-gray-600">
              <T>Printer language</T>
              <select
                value={cfg.labelPrinter.language}
                onChange={(e) =>
                  updateLabelPrinter({
                    language: e.target.value as HardwareConfig["labelPrinter"]["language"],
                  })
                }
                className="mt-1 w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg"
              >
                <option value="ZPL">ZPL (Zebra)</option>
                <option value="TSPL">TSPL (TSC / XPrinter)</option>
                <option value="EPL">EPL (legacy Eltron)</option>
                <option value="ESC_POS">ESC/POS (receipt thermal)</option>
              </select>
            </label>
            {cfg.labelPrinter.transport === "network" && (
              <div className="grid grid-cols-3 gap-1 col-span-2">
                <input
                  placeholder="192.168.1.100"
                  value={cfg.labelPrinter.host ?? ""}
                  onChange={(e) => updateLabelPrinter({ host: e.target.value })}
                  className="col-span-2 px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="9100"
                  value={cfg.labelPrinter.port ?? 9100}
                  onChange={(e) => updateLabelPrinter({ port: Number(e.target.value) || 9100 })}
                  className="px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <label className="text-[11px] text-gray-600">
              <T>Width mm</T>
              <input
                type="number"
                min={20}
                max={100}
                value={cfg.labelPrinter.widthMm}
                onChange={(e) =>
                  updateLabelPrinter({
                    widthMm: Number(e.target.value) || 50,
                  })
                }
                className="mt-1 w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg"
              />
            </label>
            <label className="text-[11px] text-gray-600">
              <T>Height mm</T>
              <input
                type="number"
                min={10}
                max={80}
                value={cfg.labelPrinter.heightMm}
                onChange={(e) =>
                  updateLabelPrinter({
                    heightMm: Number(e.target.value) || 25,
                  })
                }
                className="mt-1 w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg"
              />
            </label>
            <label className="text-[11px] text-gray-600">
              <T>DPI</T>
              <select
                value={cfg.labelPrinter.dpi}
                onChange={(e) =>
                  updateLabelPrinter({
                    dpi: Number(e.target.value) === 300 ? 300 : 203,
                  })
                }
                className="mt-1 w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg"
              >
                <option value={203}>203</option>
                <option value={300}>300</option>
              </select>
            </label>
          </div>

          {cfg.labelPrinter.deviceLabel && (
            <p className="text-[11px] text-gray-500 mb-3">
              <T>Paired</T>:{" "}
              <span className="text-gray-700 font-medium">
                {cfg.labelPrinter.deviceLabel}
              </span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePairLabel}
              disabled={
                pairingLabel ||
                !["web-serial", "webusb", "bluetooth"].includes(
                  cfg.labelPrinter.transport,
                )
              }
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 text-amber-800 text-xs font-semibold disabled:opacity-40"
            >
              {pairingLabel ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : cfg.labelPrinter.transport === "bluetooth" ? (
                <Bluetooth className="h-3.5 w-3.5" />
              ) : (
                <Usb className="h-3.5 w-3.5" />
              )}
              <T>Pair device</T>
            </button>
            <button
              onClick={handleTestLabel}
              disabled={testingLabel || !cfg.labelPrinter.enabled}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold disabled:opacity-40"
            >
              {testingLabel ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5" />
              )}
              <T>Test label</T>
            </button>
          </div>

          {!cfg.labelPrinter.enabled && (
            <p className="text-[10px] text-gray-400 mt-2">
              <T>Default tag size</T>: {cfg.labelPrinter.widthMm}×
              {cfg.labelPrinter.heightMm}mm @ {cfg.labelPrinter.dpi} dpi
            </p>
          )}
        </section>
      </div>

      {/* Auto-save status */}
      <div className="px-4 py-3 bg-white border-t border-gray-100">
        <div className="flex justify-center" data-tour="hardware-save">
          <SettingsSaveStatus
            status={saveStatus}
            idleLabel="Hardware changes save automatically"
          />
        </div>
      </div>
    </div>
  );
}
