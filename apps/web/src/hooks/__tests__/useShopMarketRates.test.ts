import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useShopMarketRates } from "../useShopMarketRates";

const mocks = vi.hoisted(() => ({
  auth: { user: null as any },
  getMarketRates: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mocks.auth,
}));

vi.mock("@/lib/api", () => ({
  materialsApi: {
    getMarketRates: mocks.getMarketRates,
  },
}));

describe("useShopMarketRates", () => {
  beforeEach(() => {
    mocks.getMarketRates.mockReset();
    mocks.auth.user = null;
  });

  afterEach(() => cleanup());

  it("does not fetch until the shop country is present", async () => {
    mocks.auth.user = { shop: null };
    renderHook(() => useShopMarketRates());
    await Promise.resolve();
    expect(mocks.getMarketRates).not.toHaveBeenCalled();
  });

  it("fetches shop INR after auth hydrates and ignores a prior empty shop", async () => {
    mocks.getMarketRates.mockResolvedValue({
      data: {
        metals: { GOLD_24K: 14515.47 },
        currency: "INR",
        cache: "hit",
        updatedAt: "2026-09-03T10:00:00.000Z",
      },
    });
    mocks.auth.user = { shop: null };
    const { rerender, result } = renderHook(() => useShopMarketRates());
    expect(mocks.getMarketRates).not.toHaveBeenCalled();

    mocks.auth.user = { shop: { country: "IN", currency: "INR" } };
    rerender();

    await waitFor(() => {
      expect(mocks.getMarketRates).toHaveBeenCalledWith({
        country: "IN",
        currency: "INR",
      });
    });
    await waitFor(() => {
      expect(result.current.rates?.metals.GOLD_24K).toBe(14515.47);
      expect(result.current.rates?.currency).toBe("INR");
    });
    expect(mocks.getMarketRates).not.toHaveBeenCalledWith(
      expect.objectContaining({ currency: "USD" }),
    );
  });
});
