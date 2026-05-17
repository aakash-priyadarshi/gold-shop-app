"use client";

import { MobileHelpButton } from "@/components/mobile/MobileHelpButton";
import { T } from "@/components/ui/T";
import { useToast } from "@/components/ui/use-toast";
import {
    buildEscPosReceipt,
    defaultHardwareConfig,
    hasBarcodeDetector,
    hasCameraScanning,
    hasWebBluetooth,
    hasWebUSB,
    kickCashDrawer,
    loadHardwareConfig,
    pairUsbPrinter,
    printReceiptBytes,
    saveHardwareConfig,
    type HardwareConfig,
    type PaperWidth,
    type PrinterTransport,
    type ScannerSource,
} from "@/lib/posHardware";
import {
    ArrowLeft,
    Bluetooth,
    Camera,
    Check,
    Keyboard,
    Loader2,
    Printer,
    Save,
    ScanLine,
    Usb,
    Wifi,
    Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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
    id: "webusb",
    label: "USB",
    Icon: Usb,
    hint: "Thermal printer over USB (Epson TM, Star, generic 58/80mm)",
    available: () => hasWebUSB(),
  },
  {
    id: "bluetooth",
    label: "Bluetooth",
    Icon: Bluetooth,
    hint: "Pair via the Orivraa desktop app",
    available: () => hasWebBluetooth(),
  },
  {
    id: "network",
    label: "Network",
    Icon: Wifi,
    hint: "TCP raw 9100 – via desktop app / print agent",
    available: () => true,
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
    hint: "Uses the back camera + BarcodeDetector API",
    available: () => hasBarcodeDetector() && hasCameraScanning(),
  },
  {
    id: "manual",
    label: "Manual entry",
    Icon: Keyboard,
    hint: "Type or paste the SKU",
    available: () => true,
  },
];

export default function HardwareSettingsPage() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<HardwareConfig>(defaultHardwareConfig);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [pairing, setPairing] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setCfg(loadHardwareConfig());
    setLoaded(true);
  }, []);

  const updateScanner = (patch: Partial<HardwareConfig["scanner"]>) =>
    setCfg((c) => ({ ...c, scanner: { ...c.scanner, ...patch } }));
  const updatePrinter = (patch: Partial<HardwareConfig["printer"]>) =>
    setCfg((c) => ({ ...c, printer: { ...c.printer, ...patch } }));

  const handleSave = () => {
    setSaving("saving");
    saveHardwareConfig(cfg);
    setTimeout(() => {
      setSaving("saved");
      setTimeout(() => setSaving("idle"), 1500);
    }, 250);
  };

  const handlePair = async () => {
    setPairing(true);
    try {
      const result = await pairUsbPrinter();
      if (result) {
        updatePrinter({
          enabled: true,
          transport: "webusb",
          deviceLabel: result.label,
        });
        toast({
          title: "Printer paired",
          description: result.label,
        });
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
      const bytes = buildEscPosReceipt(
        {
          shopName: "Orivraa Test Receipt",
          shopPhone: "Hardware self-test",
          invoiceNumber: "TEST-001",
          issuedAt: new Date(),
          currency: "INR",
          lines: [
            { label: "Test Item 1", qty: 1, amount: 100 },
            { label: "Test Item 2", qty: 2, amount: 250 },
          ],
          subtotal: 350,
          total: 350,
        },
        cfg.printer.paperWidth,
        { kickDrawer: cfg.printer.kickCashDrawer },
      );
      await printReceiptBytes(bytes);
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
            href="/m/settings"
            className="p-2 -ml-2 rounded-xl text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-center flex-1">
            <h1 className="text-base font-bold text-gray-900">
              <T>POS Hardware</T>
            </h1>
            <p className="text-[11px] text-gray-400">
              <T>Barcode scanner · Receipt printer · Cash drawer</T>
            </p>
          </div>
          <MobileHelpButton
            title="POS Hardware"
            description="Connect a barcode scanner, thermal receipt printer and cash drawer to your phone or tablet."
            tips={[
              "Any USB or Bluetooth scanner that types like a keyboard works without setup",
              "USB thermal printers (Epson TM, Star, generic 58/80mm) work directly from Chrome / Edge",
              "Bluetooth & network printers are supported in the Orivraa Desktop app",
            ]}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Scanner section */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
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
        <section className="bg-white rounded-2xl border border-gray-100 p-4">
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

          <div className="grid grid-cols-2 gap-2 mb-3">
            {TRANSPORTS.map((t) => {
              const active = cfg.printer.transport === t.id;
              const disabled = !t.available();
              const Icon = t.Icon;
              return (
                <button
                  key={t.id}
                  onClick={() => updatePrinter({ transport: t.id })}
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
              <T>Paired</T>:{" "}
              <span className="text-gray-700 font-medium">
                {cfg.printer.deviceLabel}
              </span>
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
              disabled={pairing || cfg.printer.transport !== "webusb"}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 text-amber-800 text-xs font-semibold disabled:opacity-40"
            >
              {pairing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Usb className="h-3.5 w-3.5" />
              )}
              <T>Pair USB</T>
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
      </div>

      {/* Sticky save */}
      <div className="px-4 py-3 bg-white border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={saving === "saving"}
          className="w-full py-3 bg-amber-500 text-white text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 active:bg-amber-600 disabled:opacity-60"
        >
          {saving === "saving" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saving === "saved" ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <T>{saving === "saved" ? "Saved" : "Save hardware settings"}</T>
        </button>
      </div>
    </div>
  );
}
