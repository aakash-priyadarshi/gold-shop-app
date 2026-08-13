import { computeGoldLoss } from "@gold-shop/shared";

describe("karigar gold-loss identities", () => {
  it("matches the 1kg sample tree used in loadSampleJob", () => {
    const loss = computeGoldLoss({
      issuedGrams: 1000,
      finishedGrams: 920,
      sprueButtonGrams: 50,
      recoverableGrams: 20,
      allowedPercent: 1,
    });
    expect(loss.actualLoss).toBe(10);
    expect(loss.unexplained).toBe(0);
  });
});
