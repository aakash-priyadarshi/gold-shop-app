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

  it("defaults a missing workshop key to enabled on Pro+ and Enterprise", () => {
    const enterprise = buildFeaturesState({
      planName: "Enterprise (India)",
      planId: "enterprise-in",
      planTier: "ENTERPRISE",
      features: [{ key: "crm", label: "CRM", category: "CRM", enabled: true }],
    });
    expect(enterprise.map.workshopManufacturing).toBe(true);

    const proPlus = buildFeaturesState({
      planName: "Pro+ (India)",
      planTier: "PRO_PLUS",
      features: { crm: true },
    });
    expect(proPlus.map.workshopManufacturing).toBe(true);
  });

  it("does not invent workshop access on Free or Pro", () => {
    const free = buildFeaturesState({
      planName: "Free (India)",
      planTier: "FREE",
      features: [],
    });
    expect(free.map.workshopManufacturing).not.toBe(true);

    const pro = buildFeaturesState({
      planName: "Pro (India)",
      planTier: "PRO",
      features: [],
    });
    expect(pro.map.workshopManufacturing).not.toBe(true);
  });

  it("does not treat a Free tier as workshop-capable when the name contains Pro+", () => {
    const state = buildFeaturesState({
      planName: "Pro+ trial leftover",
      planTier: "FREE",
      features: [],
    });
    expect(state.map.workshopManufacturing).not.toBe(true);
  });

  it("respects an explicit workshopManufacturing false", () => {
    const state = buildFeaturesState(response(false, "Enterprise (India)").data);
    expect(state.map.workshopManufacturing).toBe(false);
  });

  it("reads a nested data envelope and a raw plan JSON map", () => {
    const nested = buildFeaturesState({
      data: {
        planName: "Pro+ (India)",
        planTier: "PRO_PLUS",
        features: { workshopManufacturing: true },
      },
    });
    expect(nested.map.workshopManufacturing).toBe(true);
    expect(nested.planName).toBe("Pro+ (India)");
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
