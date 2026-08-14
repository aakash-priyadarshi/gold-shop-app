import { describe, expect, it } from "vitest";
import {
  classifyPrinterName,
  looksLikeOfficePrinter,
  looksLikeThermalPrinter,
  targetFromConfig,
} from "../invoicePrintTarget";
import { defaultHardwareConfig } from "../posHardware";

describe("looksLikeThermalPrinter", () => {
  it("recognises SEZNIK / MiniX / 58mm names as thermal", () => {
    expect(looksLikeThermalPrinter("SEZNIK MiniX")).toBe(true);
    expect(looksLikeThermalPrinter("POS-80-BT")).toBe(true);
    expect(looksLikeThermalPrinter("Epson TM-T20")).toBe(true);
  });

  it("does not treat office printers as thermal", () => {
    expect(looksLikeThermalPrinter("HP LaserJet Pro")).toBe(false);
    expect(looksLikeThermalPrinter("Canon PIXMA")).toBe(false);
    expect(looksLikeThermalPrinter("")).toBe(false);
  });
});

describe("classifyPrinterName", () => {
  it("labels office printers as A4 / office", () => {
    expect(looksLikeOfficePrinter("HP LaserJet Pro")).toBe(true);
    expect(classifyPrinterName("Brother MFC-L2710")).toBe("system");
    expect(classifyPrinterName("Canon PIXMA")).toBe("system");
  });

  it("keeps Epson TM as thermal, not office", () => {
    expect(classifyPrinterName("Epson TM-T20")).toBe("thermal");
    expect(looksLikeOfficePrinter("Epson TM-T20")).toBe(false);
  });

  it("treats Generic / Text Only POS drivers as thermal", () => {
    expect(
      classifyPrinterName("XP-58 Generic / Text Only USB001"),
    ).toBe("thermal");
  });
});

describe("targetFromConfig", () => {
  it("uses A4 / office printer when no thermal is configured", () => {
    const target = targetFromConfig(defaultHardwareConfig, []);
    expect(target.mode).toBe("system");
    expect(target.subtitle).toContain("A4 / office printer");
  });

  it("labels a paired wireless thermal as a thermal receipt printer", () => {
    const cfg = {
      ...defaultHardwareConfig,
      printer: {
        ...defaultHardwareConfig.printer,
        enabled: true,
        transport: "bluetooth" as const,
        paperWidth: 58 as const,
        deviceLabel: "SEZNIK MiniX",
      },
    };
    const target = targetFromConfig(cfg, []);
    expect(target.mode).toBe("thermal");
    expect(target.subtitle).toBe("Thermal receipt · 58mm · SEZNIK MiniX");
  });

  it("uses a detected USB thermal name when config has no label", () => {
    const cfg = {
      ...defaultHardwareConfig,
      printer: {
        ...defaultHardwareConfig.printer,
        enabled: true,
        transport: "webusb" as const,
        paperWidth: 80 as const,
      },
    };
    const target = targetFromConfig(cfg, [
      {
        id: "usb:1",
        name: "Epson TM-T20",
        kind: "thermal" as const,
        source: "usb" as const,
      },
    ]);
    expect(target.mode).toBe("thermal");
    expect(target.deviceName).toBe("Epson TM-T20");
    expect(target.subtitle).toContain("80mm");
  });

  it("uses an OS-listed thermal even when hardware settings are still on A4", () => {
    const target = targetFromConfig(defaultHardwareConfig, [
      {
        id: "os:HP",
        name: "HP LaserJet Pro",
        kind: "system",
        source: "os",
        isDefault: true,
      },
      {
        id: "os:TM",
        name: "EPSON TM-T20",
        kind: "thermal",
        source: "os",
      },
    ]);
    expect(target.mode).toBe("thermal");
    expect(target.transport).toBe("os");
    expect(target.osPrinterName).toBe("EPSON TM-T20");
    expect(target.subtitle).toContain("EPSON TM-T20");
  });

  it("names the default office printer when no thermal is listed", () => {
    const target = targetFromConfig(defaultHardwareConfig, [
      {
        id: "os:HP",
        name: "HP LaserJet Pro",
        kind: "system",
        source: "os",
        isDefault: true,
      },
    ]);
    expect(target.mode).toBe("system");
    expect(target.subtitle).toContain("HP LaserJet Pro");
  });

  it("does not send BLE/USB jobs to an OS thermal spooler name", () => {
    const cfg = {
      ...defaultHardwareConfig,
      printer: {
        ...defaultHardwareConfig.printer,
        enabled: true,
        transport: "bluetooth" as const,
        paperWidth: 58 as const,
        deviceLabel: "SEZNIK MiniX",
      },
    };
    const target = targetFromConfig(cfg, [
      {
        id: "os:TM",
        name: "EPSON TM-T20",
        kind: "thermal" as const,
        source: "os" as const,
      },
    ]);
    expect(target.mode).toBe("thermal");
    expect(target.transport).toBe("bluetooth");
    expect(target.osPrinterName).toBeUndefined();
  });

  it("keeps A4 when the seller explicitly chose office print", () => {
    const cfg = {
      ...defaultHardwareConfig,
      printer: {
        ...defaultHardwareConfig.printer,
        transport: "browser" as const,
        preferA4: true,
      },
    };
    const target = targetFromConfig(cfg, [
      {
        id: "os:TM",
        name: "EPSON TM-T20",
        kind: "thermal" as const,
        source: "os" as const,
      },
    ]);
    expect(target.mode).toBe("system");
    expect(target.osPrinterName).toBeUndefined();
  });
});
