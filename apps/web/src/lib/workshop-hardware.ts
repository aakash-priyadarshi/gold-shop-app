import { gramsToMicrograms, parseAsciiNetScaleFrame } from "@gold-shop/shared";
import { invokeTauri } from "@/lib/posHardware";

export type WorkshopDevice = {
  id: string;
  name: string;
  purpose: "GOLD" | "STONE";
  adapterKind: "SIMULATOR" | "SERIAL" | "TCP";
  precisionGrams: string;
  profile?: {
    parser?: { kind: "ASCII_LINE"; stableToken: string; unstableToken: string };
    transport?: Record<string, unknown>;
  } | null;
};

export type RawScaleFrame = { rawFrame: string; readingAt: string };

/** The Desktop command only reads bounded raw frames. This validation is for
 *  immediate operator feedback; the API independently validates the same frames. */
export async function readPhysicalWorkshopScale(device: WorkshopDevice) {
  if (device.adapterKind === "SIMULATOR") throw new Error("Choose the demo scale control for a simulator");
  const parser = device.profile?.parser;
  const config = device.profile?.transport;
  if (!parser || parser.kind !== "ASCII_LINE" || !config) throw new Error("Registered scale has no parser or transport profile");
  const transport = device.adapterKind === "TCP"
    ? { kind: "TCP", host: config.host, port: config.port }
    : { kind: "SERIAL", port: config.port, baudRate: config.baudRate, dataBits: config.dataBits, stopBits: config.stopBits, parity: config.parity };
  const read = invokeTauri<RawScaleFrame[]>("read_scale_frames", { transport, maxFrames: 3 });
  if (!read) throw new Error("Open Orivraa Desktop to read this physical scale");
  const samples = await read;
  if (samples.length !== 3) throw new Error("Scale did not provide three complete frames within five seconds");
  const parsed = samples.map((sample) => parseAsciiNetScaleFrame(sample.rawFrame, parser));
  if (parsed.some((sample) => !sample.stable)) throw new Error("Scale is unstable; wait and read again");
  if (parsed.some((sample) => gramsToMicrograms(sample.weightGrams) !== gramsToMicrograms(parsed[0].weightGrams))) throw new Error("Scale weight changed; wait and read again");
  return { ...parsed[2], samples, readingAt: samples[2].readingAt, rawFrame: samples[2].rawFrame };
}

export async function listWorkshopSerialPorts(): Promise<string[]> {
  const read = invokeTauri<string[]>("list_scale_serial_ports");
  if (!read) throw new Error("Open Orivraa Desktop to list local serial scales");
  return read;
}
