import { describe, expect, it } from "vitest";
import {
  collectProductCertificates,
  isCertificatePdfUrl,
} from "../certificates";

describe("isCertificatePdfUrl", () => {
  it("detects PDF certificates", () => {
    expect(isCertificatePdfUrl("https://images.orivraa.com/certificate/1.pdf")).toBe(
      true,
    );
    expect(
      isCertificatePdfUrl("https://images.orivraa.com/certificate/1.webp"),
    ).toBe(false);
  });
});

describe("collectProductCertificates", () => {
  it("includes hallmark, gemstone, and per-stone reports", () => {
    expect(
      collectProductCertificates({
        certificateUrl: "https://cdn/hallmark.webp",
        purityCertUrl: "https://cdn/gem.pdf",
        gemstones: [
          { type: "Diamond", lab: "GIA", certNumber: "2141", reportUrl: "https://cdn/gia.pdf" },
          { type: "Ruby" },
        ],
      }),
    ).toEqual([
      { kind: "hallmark", label: "Hallmark certificate", url: "https://cdn/hallmark.webp" },
      { kind: "gemstone", label: "Gemstone certificate", url: "https://cdn/gem.pdf" },
      { kind: "stone", label: "GIA 2141 certificate", url: "https://cdn/gia.pdf" },
    ]);
  });
});
