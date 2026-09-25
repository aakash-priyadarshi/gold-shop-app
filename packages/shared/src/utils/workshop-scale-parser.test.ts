import { describe, expect, it } from "vitest";
import { parseAsciiNetScaleFrame } from "./workshop-scale";

const profile = { kind: "ASCII_LINE", stableToken: "ST", unstableToken: "US" } as const;

describe("generic ASCII net scale parser", () => {
  it("accepts explicit stable net grams without software tare", () => {
    expect(parseAsciiNetScaleFrame("ST,NET,+100.25,g", profile)).toEqual({ weightGrams: "100.25", stable: true });
    expect(parseAsciiNetScaleFrame("US;NET;0.001;g", profile)).toEqual({ weightGrams: "0.001", stable: false });
  });

  it.each(["NET,100.25,g", "ST,GROSS,100.25,g", "ST,NET,100.25,oz", "ST,US,NET,100.25,g", "ST,NET,100.25,200,g"])(
    "fails closed for incomplete or ambiguous frame %s",
    (frame) => expect(() => parseAsciiNetScaleFrame(frame, profile)).toThrow(),
  );
});
