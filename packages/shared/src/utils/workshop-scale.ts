import {
  GOLD_SCALE_QUANTUM_GRAMS,
  STONE_SCALE_QUANTUM_GRAMS,
  WORKSHOP_GOLD_995_MATERIAL_KEY,
  assertPositiveQuantumGrams,
  type WorkshopScalePurpose,
} from "./workshop-decimal";

export type WorkshopScaleAdapterKind =
  | "SIMULATOR"
  | "SERIAL"
  | "USB"
  | "ETHERNET"
  | "TCP";

export interface AsciiLineScaleParserProfile {
  kind: "ASCII_LINE";
  stableToken: string;
  unstableToken: string;
}

/** Generic `ST,NET,+12.34,g`-style frame; a vendor profile supplies the two
 *  explicit status tokens. Missing status, NET, unit, or a unique weight fails closed. */
export function parseAsciiNetScaleFrame(rawFrame: string, profile: AsciiLineScaleParserProfile) {
  if (rawFrame.length > 500 || !rawFrame.trim() || /[^\x09\x20-\x7e]/.test(rawFrame)) {
    throw new Error("Invalid ASCII scale frame");
  }
  const tokens = rawFrame.trim().split(/[,;\s]+/).filter(Boolean);
  if (tokens.some((token) => token === "-" || /^-\d/.test(token))) {
    throw new Error("Scale frame reports a negative or signed-ambiguous weight");
  }
  const stable = tokens.includes(profile.stableToken);
  const unstable = tokens.includes(profile.unstableToken);
  if (stable === unstable) throw new Error("Scale frame must contain exactly one explicit stability token");
  if (!tokens.some((token) => token.toUpperCase() === "NET")) throw new Error("Scale must report net weight after physical tare");
  if (!tokens.some((token) => token.toLowerCase() === "g")) throw new Error("Scale frame must report grams");
  const weights = tokens.filter((token) => /^\+?\d+(?:\.\d+)?$/.test(token));
  if (weights.length !== 1) throw new Error("Scale frame must contain one unambiguous gram value");
  return { weightGrams: weights[0].replace(/^\+/, ""), stable };
}

/**
 * Normalized reading every adapter (simulator, RS-232, USB, Ethernet) must
 * produce. `stable` is required — absence is not treated as stable.
 * Weight is net material; tare/zero happens on the physical device.
 */
export interface NormalizedScaleReading {
  purpose: WorkshopScalePurpose;
  weightGrams: string;
  unit: "g";
  precisionGrams: string;
  stable: boolean;
  sequence: number;
  rawFrame: string;
  readingAt: string;
  adapterKind: WorkshopScaleAdapterKind;
}

export interface WorkshopScaleAdapter {
  readonly kind: WorkshopScaleAdapterKind;
  readonly purpose: WorkshopScalePurpose;
  connect(): void;
  disconnect(): void;
  isConnected(): boolean;
  /** Latest reading, or null if the adapter has not produced one yet. */
  read(): NormalizedScaleReading | null;
}

export function precisionForPurpose(purpose: WorkshopScalePurpose): string {
  return purpose === "GOLD" ? GOLD_SCALE_QUANTUM_GRAMS : STONE_SCALE_QUANTUM_GRAMS;
}

export function assertStableGoldReading(
  reading: NormalizedScaleReading,
  requiredPurpose: WorkshopScalePurpose = "GOLD",
): void {
  if (reading.stable !== true) {
    throw new Error("Scale reading is not stable");
  }
  if (reading.purpose !== requiredPurpose) {
    throw new Error(
      `Scale purpose ${reading.purpose} does not match required ${requiredPurpose}`,
    );
  }
  if (reading.unit !== "g") {
    throw new Error("Workshop scale readings must be in grams");
  }
  assertPositiveQuantumGrams(reading.weightGrams, reading.purpose);
}

/**
 * Gold Scale simulator. Returns net grams (no software tare).
 * Stability is always an explicit boolean, never inferred from a missing flag.
 */
export class GoldScaleSimulator implements WorkshopScaleAdapter {
  readonly kind = "SIMULATOR" as const;
  readonly purpose = "GOLD" as const;
  readonly materialKey = WORKSHOP_GOLD_995_MATERIAL_KEY;

  private connected = false;
  private sequence = 0;
  private liveGrams: string;
  private forcedStable: boolean | null = null;

  constructor(initialNetGrams = "100.25", initialSequence = 0) {
    assertPositiveQuantumGrams(initialNetGrams, "GOLD");
    if (!Number.isSafeInteger(initialSequence) || initialSequence < 0) {
      throw new Error("Simulator sequence must be a non-negative safe integer");
    }
    this.liveGrams = initialNetGrams;
    this.sequence = initialSequence;
  }

  connect(): void {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  /** Test/UI control: set net weight already tared on the "device". */
  setNetWeight(grams: string): void {
    assertPositiveQuantumGrams(grams, "GOLD");
    this.liveGrams = grams;
  }

  /**
   * Force the next read's stable flag. Pass `null` to leave it explicitly
   * unstable until set true. Never defaults missing → stable.
   */
  setStable(stable: boolean | null): void {
    this.forcedStable = stable;
  }

  read(): NormalizedScaleReading | null {
    if (!this.connected) return null;
    this.sequence += 1;
    const stable = this.forcedStable === true;
    return {
      purpose: "GOLD",
      weightGrams: this.liveGrams,
      unit: "g",
      precisionGrams: GOLD_SCALE_QUANTUM_GRAMS,
      stable,
      sequence: this.sequence,
      rawFrame: `SIM,${stable ? "ST" : "US"},NET,${this.liveGrams} g`,
      readingAt: new Date().toISOString(),
      adapterKind: "SIMULATOR",
    };
  }
}

/** Demo-only Stone Scale with 0.001 g resolution and the same capture shape. */
export class StoneScaleSimulator implements WorkshopScaleAdapter {
  readonly kind = "SIMULATOR" as const;
  readonly purpose = "STONE" as const;
  private connected = false;
  private sequence = 0;
  private netGrams: string;
  private stable = false;

  constructor(initialNetGrams = "0.125", initialSequence = 0) {
    assertPositiveQuantumGrams(initialNetGrams, "STONE");
    if (!Number.isSafeInteger(initialSequence) || initialSequence < 0) throw new Error("Invalid simulator sequence");
    this.netGrams = initialNetGrams;
    this.sequence = initialSequence;
  }

  connect() { this.connected = true; }
  disconnect() { this.connected = false; }
  isConnected() { return this.connected; }
  setNetWeight(grams: string) {
    assertPositiveQuantumGrams(grams, "STONE");
    this.netGrams = grams;
  }
  setStable(stable: boolean) { this.stable = stable; }
  read(): NormalizedScaleReading | null {
    if (!this.connected) return null;
    this.sequence += 1;
    return {
      purpose: "STONE", weightGrams: this.netGrams, unit: "g",
      precisionGrams: STONE_SCALE_QUANTUM_GRAMS, stable: this.stable,
      sequence: this.sequence, rawFrame: `SIM,${this.stable ? "ST" : "US"},NET,${this.netGrams} g`,
      readingAt: new Date().toISOString(), adapterKind: "SIMULATOR",
    };
  }
}
