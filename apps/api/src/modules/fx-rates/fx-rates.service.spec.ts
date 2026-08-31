import { FxRatesService } from "./fx-rates.service";

describe("FxRatesService provider freshness", () => {
  const config = { get: jest.fn().mockReturnValue(undefined) } as any;
  const prisma = {} as any;
  const http = { get: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("timestamps a successfully fetched daily INR rate at ingestion time", async () => {
    http.get.mockResolvedValue({
      data: {
        // A Friday reference rate remains the latest valid market rate during
        // a weekend; this must not make checkout fail on Monday.
        date: "2026-08-28",
        rates: { INR: 90.25 },
      },
    });
    const service = new FxRatesService(config, prisma, http);
    const beforeFetch = Date.now();

    const snapshot = await (service as any).fetchFromFrankfurterProvider();

    expect(new Date(snapshot.USD_INR.updatedAt).getTime()).toBeGreaterThanOrEqual(
      beforeFetch,
    );
    expect(snapshot.USD_INR.rate).toBe(90.25);
    expect(snapshot.USD_NPR.rate).toBeCloseTo(144.4);
  });
});
