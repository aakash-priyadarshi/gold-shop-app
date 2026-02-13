/**
 * useWeighingScale — Web Serial API hook for digital jeweler scales
 * 
 * Connects to USB/Serial weighing scales (Shimadzu, CAS, A&D, etc.)
 * via Web Serial API for live weight reading in browser.
 * 
 * Most jeweler scales output ASCII via RS232/USB serial:
 *   "ST,GS,  2.200 g\r\n" or "  2.200 g\r\n"
 * 
 * Supports:
 *   - Auto-detection of common serial protocols
 *   - Tare (zero) functionality
 *   - Unit conversion (g, oz, tola, dwt)
 *   - Stable reading detection
 *   - Live price calculation integration
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type WeightUnit = "g" | "oz" | "tola" | "dwt" | "kg";

export interface ScaleConfig {
  baudRate: number;
  dataBits: 7 | 8;
  stopBits: 1 | 2;
  parity: "none" | "even" | "odd";
  flowControl: "none" | "hardware";
}

export interface ScaleReading {
  weight: number;
  unit: WeightUnit;
  stable: boolean;
  raw: string;
  timestamp: number;
}

export interface ScaleState {
  connected: boolean;
  connecting: boolean;
  portName: string | null;
  lastReading: ScaleReading | null;
  error: string | null;
  supported: boolean;
}

export interface UseWeighingScaleReturn extends ScaleState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  tare: () => void;
  setUnit: (unit: WeightUnit) => void;
  getWeightInGrams: () => number;
  readings: ScaleReading[];
}

// Common scale protocols
export const SCALE_PRESETS: Record<string, ScaleConfig> = {
  default: { baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none", flowControl: "none" },
  shimadzu: { baudRate: 2400, dataBits: 7, stopBits: 2, parity: "even", flowControl: "none" },
  cas: { baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none", flowControl: "none" },
  and: { baudRate: 2400, dataBits: 7, stopBits: 1, parity: "even", flowControl: "none" },
  mettler: { baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none", flowControl: "none" },
  ohaus: { baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none", flowControl: "none" },
};

// Weight conversion factors to grams
const WEIGHT_TO_GRAMS: Record<WeightUnit, number> = {
  g: 1,
  oz: 31.1035, // troy ounce
  tola: 11.6638,
  dwt: 1.55517, // pennyweight
  kg: 1000,
};

// Parse weight from common scale output formats
function parseScaleOutput(raw: string): { weight: number; unit: WeightUnit; stable: boolean } | null {
  const cleaned = raw.trim();
  if (!cleaned || cleaned.length < 2) return null;

  // Stability indicator: "ST" = stable, "US" = unstable
  const stable = !cleaned.includes("US") && !cleaned.includes("OL"); // OL = overload

  // Common patterns:
  // "ST,GS,  2.200 g"
  // "  2.200 g"
  // "+  2.200 g"
  // "ST,NT,  2.200 g"
  // "2.200g"
  // "     2.200  g  "
  
  const patterns = [
    /([+-]?\s*[\d.]+)\s*(g|oz|dwt|tola|kg|ct)\b/i,
    /([+-]?\s*[\d.]+)\s*$/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const weight = parseFloat(match[1].replace(/\s/g, ""));
      if (isNaN(weight)) continue;
      
      let unit: WeightUnit = "g";
      if (match[2]) {
        const u = match[2].toLowerCase();
        if (u === "oz") unit = "oz";
        else if (u === "dwt") unit = "dwt";
        else if (u === "tola") unit = "tola";
        else if (u === "kg") unit = "kg";
      }
      
      return { weight, unit, stable };
    }
  }

  return null;
}

export function useWeighingScale(config?: Partial<ScaleConfig>): UseWeighingScaleReturn {
  const [state, setState] = useState<ScaleState>({
    connected: false,
    connecting: false,
    portName: null,
    lastReading: null,
    error: null,
    supported: typeof window !== "undefined" && "serial" in navigator,
  });

  const [readings, setReadings] = useState<ScaleReading[]>([]);
  const [displayUnit, setDisplayUnit] = useState<WeightUnit>("g");
  const [tareOffset, setTareOffset] = useState(0);

  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const bufferRef = useRef("");
  const activeRef = useRef(false);

  const scaleConfig: ScaleConfig = {
    ...SCALE_PRESETS.default,
    ...config,
  };

  const connect = useCallback(async () => {
    if (!("serial" in navigator)) {
      setState((s) => ({ ...s, error: "Web Serial API not supported. Use Chrome or Edge." }));
      return;
    }

    setState((s) => ({ ...s, connecting: true, error: null }));

    try {
      const port = await (navigator as any).serial.requestPort({
        filters: [], // Show all ports
      });

      await port.open({
        baudRate: scaleConfig.baudRate,
        dataBits: scaleConfig.dataBits,
        stopBits: scaleConfig.stopBits,
        parity: scaleConfig.parity,
        flowControl: scaleConfig.flowControl,
      });

      portRef.current = port;
      activeRef.current = true;

      const info = port.getInfo?.();
      const portName = info?.usbVendorId
        ? `USB (${info.usbVendorId}:${info.usbProductId})`
        : "Serial Port";

      setState((s) => ({
        ...s,
        connected: true,
        connecting: false,
        portName,
        error: null,
      }));

      // Start reading
      readLoop(port);
    } catch (err: any) {
      if (err.name === "NotFoundError") {
        setState((s) => ({ ...s, connecting: false, error: "No port selected" }));
      } else {
        setState((s) => ({
          ...s,
          connecting: false,
          error: err.message || "Failed to connect to scale",
        }));
      }
    }
  }, [scaleConfig]);

  const readLoop = async (port: SerialPort) => {
    const decoder = new TextDecoderStream();
    const readableStreamClosed = port.readable!.pipeTo(decoder.writable);
    const reader = decoder.readable.getReader();
    readerRef.current = reader;

    try {
      while (activeRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        bufferRef.current += value;

        // Process complete lines (delimited by \r\n or \n)
        const lines = bufferRef.current.split(/\r?\n/);
        bufferRef.current = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          
          const parsed = parseScaleOutput(line);
          if (parsed) {
            // Convert to display unit and apply tare
            const weightInGrams = parsed.weight * WEIGHT_TO_GRAMS[parsed.unit] - tareOffset;
            const displayWeight = weightInGrams / WEIGHT_TO_GRAMS[displayUnit];

            const reading: ScaleReading = {
              weight: Math.max(0, parseFloat(displayWeight.toFixed(3))),
              unit: displayUnit,
              stable: parsed.stable,
              raw: line,
              timestamp: Date.now(),
            };

            setState((s) => ({ ...s, lastReading: reading }));
            setReadings((r) => [...r.slice(-99), reading]); // Keep last 100 readings
          }
        }
      }
    } catch (err: any) {
      if (activeRef.current) {
        setState((s) => ({ ...s, error: `Read error: ${err.message}` }));
      }
    } finally {
      reader.releaseLock();
      try { await readableStreamClosed; } catch {}
    }
  };

  const disconnect = useCallback(async () => {
    activeRef.current = false;

    if (readerRef.current) {
      try { await readerRef.current.cancel(); } catch {}
      readerRef.current = null;
    }

    if (portRef.current) {
      try { await portRef.current.close(); } catch {}
      portRef.current = null;
    }

    setState((s) => ({
      ...s,
      connected: false,
      connecting: false,
      portName: null,
      lastReading: null,
    }));
    setReadings([]);
    setTareOffset(0);
    bufferRef.current = "";
  }, []);

  const tare = useCallback(() => {
    if (state.lastReading) {
      const currentInGrams = state.lastReading.weight * WEIGHT_TO_GRAMS[state.lastReading.unit];
      setTareOffset((prev) => prev + currentInGrams);
    }
  }, [state.lastReading]);

  const setUnit = useCallback((unit: WeightUnit) => {
    setDisplayUnit(unit);
  }, []);

  const getWeightInGrams = useCallback((): number => {
    if (!state.lastReading) return 0;
    return state.lastReading.weight * WEIGHT_TO_GRAMS[state.lastReading.unit];
  }, [state.lastReading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      disconnect();
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    tare,
    setUnit,
    getWeightInGrams,
    readings,
  };
}

/**
 * Simulated scale for testing/demo without real hardware
 */
export function useSimulatedScale(): UseWeighingScaleReturn {
  const [connected, setConnected] = useState(false);
  const [lastReading, setLastReading] = useState<ScaleReading | null>(null);
  const [readings, setReadings] = useState<ScaleReading[]>([]);
  const [unit, setDisplayUnit] = useState<WeightUnit>("g");
  const [tareOffset, setTareOffset] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connect = useCallback(async () => {
    setConnected(true);
    // Simulate readings every 500ms with slight fluctuation
    let baseWeight = 2.2; // grams
    intervalRef.current = setInterval(() => {
      const fluctuation = (Math.random() - 0.5) * 0.01; // ±0.005g
      const weight = Math.max(0, baseWeight + fluctuation - tareOffset);
      const reading: ScaleReading = {
        weight: parseFloat((weight / WEIGHT_TO_GRAMS[unit]).toFixed(3)),
        unit,
        stable: Math.abs(fluctuation) < 0.003,
        raw: `ST,GS,  ${weight.toFixed(3)} g`,
        timestamp: Date.now(),
      };
      setLastReading(reading);
      setReadings((r) => [...r.slice(-99), reading]);
    }, 500);
  }, [tareOffset, unit]);

  const disconnect = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setConnected(false);
    setLastReading(null);
    setReadings([]);
  }, []);

  const tare = useCallback(() => {
    if (lastReading) {
      setTareOffset((p) => p + lastReading.weight * WEIGHT_TO_GRAMS[lastReading.unit]);
    }
  }, [lastReading]);

  const getWeightInGrams = useCallback((): number => {
    if (!lastReading) return 0;
    return lastReading.weight * WEIGHT_TO_GRAMS[lastReading.unit];
  }, [lastReading]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    connected,
    connecting: false,
    portName: connected ? "Demo Scale (Simulated)" : null,
    lastReading,
    error: null,
    supported: true,
    connect,
    disconnect,
    tare,
    setUnit: setDisplayUnit,
    getWeightInGrams,
    readings,
  };
}
