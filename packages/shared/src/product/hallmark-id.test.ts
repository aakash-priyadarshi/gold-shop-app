import { describe, expect, it } from "vitest";
import {
  HALLMARK_ID_MAX_LENGTH,
  classifyHallmarkId,
  hallmarkIdLabel,
  isBisHuid,
  normalizeHallmarkId,
} from "./hallmark-id";

describe("normalizeHallmarkId", () => {
  it("uppercases and strips spaces and symbols except hyphen/slash", () => {
    expect(normalizeHallmarkId(" 8a9b 1c ")).toBe("8A9B1C");
    expect(normalizeHallmarkId("HUID-8X4W3P")).toBe("HUID-8X4W3P");
    expect(normalizeHallmarkId("GIA/2141438171")).toBe("GIA/2141438171");
  });

  it("keeps hallmark numbers longer than 6 characters", () => {
    expect(normalizeHallmarkId("AHM22K88421")).toBe("AHM22K88421");
  });

  it("caps length", () => {
    const long = "A".repeat(HALLMARK_ID_MAX_LENGTH + 8);
    expect(normalizeHallmarkId(long)).toHaveLength(HALLMARK_ID_MAX_LENGTH);
  });
});

describe("isBisHuid", () => {
  it("accepts exactly 6 alphanumeric characters", () => {
    expect(isBisHuid("8A9B1C")).toBe(true);
    expect(isBisHuid("HUID-8X")).toBe(false);
    expect(isBisHuid("AHM22K88421")).toBe(false);
  });
});

describe("classifyHallmarkId", () => {
  it("labels empty, HUID, and longer hallmark numbers", () => {
    expect(classifyHallmarkId("")).toBe("empty");
    expect(classifyHallmarkId("8A9B1C")).toBe("huid");
    expect(classifyHallmarkId("HUID-8X4W3P")).toBe("hallmark");
    expect(hallmarkIdLabel("8A9B1C")).toBe("HUID");
    expect(hallmarkIdLabel("AHM22K88421")).toBe("Hallmark no.");
  });
});
