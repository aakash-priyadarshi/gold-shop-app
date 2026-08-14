import {
  issueRequiresWorkshop,
  wageForFinishedReturn,
} from "./karigar-ledger";

describe("karigar ledger rules", () => {
  it("rejects issue without a workshop id", () => {
    expect(issueRequiresWorkshop(undefined)).toBe(false);
    expect(issueRequiresWorkshop("")).toBe(false);
    expect(issueRequiresWorkshop("   ")).toBe(false);
    expect(issueRequiresWorkshop("ws-1")).toBe(true);
  });

  it("accrues wages only for positive finished weight and rate", () => {
    expect(wageForFinishedReturn(10, 200)).toBe(2000);
    expect(wageForFinishedReturn(1.25, 80)).toBe(100);
    expect(wageForFinishedReturn(10, 0)).toBe(0);
    expect(wageForFinishedReturn(0, 200)).toBe(0);
  });
});
