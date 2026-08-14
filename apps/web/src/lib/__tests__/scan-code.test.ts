import { applyWedgeKey, isScanSuffixKey, normalizeScanCode } from "../scan-code";

describe("normalizeScanCode", () => {
  it("strips RFID and EPC prefixes used by HID guns", () => {
    expect(normalizeScanCode("EPC:AB12CD34")).toBe("AB12CD34");
    expect(normalizeScanCode("RFID AB12CD34")).toBe("AB12CD34");
    expect(normalizeScanCode("URN:EPC:ID:3014")).toBe("3014");
  });

  it("trims whitespace and BOM", () => {
    expect(normalizeScanCode("\uFEFF RING-001 \n")).toBe("RING-001");
  });
});

describe("applyWedgeKey", () => {
  const cfg = { minLength: 4, maxIntervalMs: 80 };

  it("commits a fast burst ending in Enter", () => {
    let state = { buffer: "", lastTime: 0 };
    const keys = ["R", "I", "N", "G", "-", "0", "0", "1"];
    keys.forEach((key, i) => {
      const result = applyWedgeKey(state, key, 10 + i * 20, cfg);
      state = result.state;
    });
    const done = applyWedgeKey(state, "Enter", 10 + keys.length * 20, cfg);
    expect(done.commit).toBe("RING-001");
  });

  it("treats Tab as a scan suffix for RFID guns", () => {
    expect(isScanSuffixKey("Tab")).toBe(true);
    let state = { buffer: "", lastTime: 0 };
    for (const [i, key] of ["A", "B", "1", "2"].entries()) {
      state = applyWedgeKey(state, key, i * 15, cfg).state;
    }
    const done = applyWedgeKey(state, "Tab", 80, cfg);
    expect(done.commit).toBe("AB12");
  });

  it("does not commit slow human typing", () => {
    let state = { buffer: "", lastTime: 0 };
    state = applyWedgeKey(state, "R", 0, cfg).state;
    const result = applyWedgeKey(state, "I", 500, cfg);
    expect(result.state.buffer).toBe("I");
    const done = applyWedgeKey(result.state, "Enter", 520, cfg);
    expect(done.commit).toBeUndefined();
  });
});
