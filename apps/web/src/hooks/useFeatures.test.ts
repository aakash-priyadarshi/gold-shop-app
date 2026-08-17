import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildFeaturesState, useFeatures } from "./useFeatures";

const mocks = vi.hoisted(() => ({
  auth: {
    user: {
      role: "SHOPKEEPER",
      shop: { id: "shop-1" },
    } as any,
  },
  getMyFeatures: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mocks.auth,
}));

vi.mock("@/lib/api", () => ({
  sellerSubscriptionsApi: {
    getMyFeatures: mocks.getMyFeatures,
  },
}));

const response = (enabled: boolean, planName = "Enterprise (UAE)") => ({
  data: {
    planName,
    planId: "enterprise-ae",
    features: [
      {
        key: "workshopManufacturing",
        label: "Workshop manufacturing",
        category: "CRM & Business",
        enabled,
      },
    ],
  },
});

describe("useFeatures", () => {
  beforeEach(() => {
    mocks.getMyFeatures.mockReset();
    mocks.auth.user = {
      role: "SHOPKEEPER",
      shop: { id: "shop-1" },
    } as any;
  });

  afterEach(() => cleanup());

  it("maps an enabled Enterprise workshop feature", () => {
    const state = buildFeaturesState(response(true).data);
    expect(state.planName).toBe("Enterprise (UAE)");
    expect(state.map.workshopManufacturing).toBe(true);
  });

  it("treats a missing feature key as disabled", () => {
    const state = buildFeaturesState({
      planName: "Enterprise (UAE)",
      planId: "enterprise-ae",
      features: [],
    });
    expect(state.map.workshopManufacturing).not.toBe(true);
  });

  it("reports a feature API failure instead of calling it a plan denial", async () => {
    mocks.getMyFeatures.mockRejectedValueOnce({
      response: { data: { message: "Plan service unavailable" } },
    });

    const { result } = renderHook(() => useFeatures());

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("Plan service unavailable");
    expect(result.current.planName).toBeNull();
  });

  it("reloads features when the active shop changes", async () => {
    mocks.getMyFeatures
      .mockResolvedValueOnce(response(false, "Pro (UAE)"))
      .mockResolvedValueOnce(response(true, "Enterprise (UAE)"));

    const { result, rerender } = renderHook(() => useFeatures());
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.hasFeature("workshopManufacturing")).toBe(false);

    mocks.auth.user = {
      role: "SHOPKEEPER",
      shop: { id: "shop-2" },
    } as any;
    rerender();

    await waitFor(() =>
      expect(result.current.planName).toBe("Enterprise (UAE)"),
    );
    expect(result.current.hasFeature("workshopManufacturing")).toBe(true);
    expect(mocks.getMyFeatures).toHaveBeenCalledTimes(2);
  });

  it("refreshes the resolved plan when the window regains focus", async () => {
    mocks.getMyFeatures
      .mockResolvedValueOnce(response(false, "Pro (UAE)"))
      .mockResolvedValueOnce(response(true, "Enterprise (UAE)"));

    const { result } = renderHook(() => useFeatures());
    await waitFor(() => expect(result.current.planName).toBe("Pro (UAE)"));

    act(() => window.dispatchEvent(new Event("focus")));

    await waitFor(() =>
      expect(result.current.planName).toBe("Enterprise (UAE)"),
    );
    expect(result.current.hasFeature("workshopManufacturing")).toBe(true);
  });
});
