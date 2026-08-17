"use client";

import { useAuth } from "@/hooks/useAuth";
import { sellerSubscriptionsApi } from "@/lib/api";
import { useCallback, useEffect, useRef, useState } from "react";

export interface PlanFeature {
  key: string;
  label: string;
  category: string;
  enabled: boolean;
}

export interface FeaturesState {
  planName: string;
  planId: string | null;
  planTier: string | null;
  features: PlanFeature[];
  /** Fast lookup: pass a feature key, get true/false */
  map: Record<string, boolean>;
  lastUpdatedAt: number;
}

export type FeaturesStatus =
  | "idle"
  | "loading"
  | "refreshing"
  | "ready"
  | "error";

const inFlightRequests = new Map<string, Promise<FeaturesState>>();

export function unwrapFeaturesPayload(payload: unknown): {
  planName?: string;
  planId?: string | null;
  planTier?: string | null;
  features?: unknown;
} {
  if (!payload || typeof payload !== "object") return {};
  const root = payload as Record<string, unknown>;
  const nested = root.data;
  if (
    nested &&
    typeof nested === "object" &&
    !Array.isArray(nested) &&
    ("features" in nested || "planName" in nested)
  ) {
    return nested as {
      planName?: string;
      planId?: string | null;
      planTier?: string | null;
      features?: unknown;
    };
  }
  return root as {
    planName?: string;
    planId?: string | null;
    planTier?: string | null;
    features?: unknown;
  };
}

export function isWorkshopPlanTier(
  planName?: string | null,
  planTier?: string | null,
): boolean {
  const tier = (planTier || "").toUpperCase();
  if (tier === "ENTERPRISE" || tier === "PRO_PLUS") return true;
  const name = (planName || "").toUpperCase();
  return (
    name.includes("ENTERPRISE") ||
    name.includes("PRO+") ||
    name.includes("PRO PLUS") ||
    name.includes("PRO_PLUS")
  );
}

export function featureListToMap(features: unknown): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  if (Array.isArray(features)) {
    for (const feature of features) {
      if (
        feature &&
        typeof feature === "object" &&
        typeof (feature as PlanFeature).key === "string"
      ) {
        map[(feature as PlanFeature).key] =
          (feature as PlanFeature).enabled === true;
      }
    }
    return map;
  }
  if (features && typeof features === "object") {
    for (const [key, value] of Object.entries(
      features as Record<string, unknown>,
    )) {
      map[key] = value === true;
    }
  }
  return map;
}

export function buildFeaturesState(data: unknown): FeaturesState {
  const payload = unwrapFeaturesPayload(data);
  const planName = payload.planName || "Free Plan";
  const planTier = payload.planTier ?? null;
  const map = featureListToMap(payload.features);
  if (
    map.workshopManufacturing === undefined &&
    isWorkshopPlanTier(planName, planTier)
  ) {
    map.workshopManufacturing = true;
  }

  const features = Array.isArray(payload.features)
    ? (payload.features as PlanFeature[])
    : Object.entries(map).map(([key, enabled]) => ({
        key,
        label: key,
        category: "Other",
        enabled,
      }));

  return {
    planName,
    planId: payload.planId ?? null,
    planTier,
    features,
    map,
    lastUpdatedAt: Date.now(),
  };
}

function featureLoadError(error: unknown): string {
  const responseMessage = (
    error as { response?: { data?: { message?: unknown } } }
  )?.response?.data?.message;
  return typeof responseMessage === "string" && responseMessage.trim()
    ? responseMessage
    : "Could not verify your current plan features. Refresh and try again.";
}

function fetchFeatures(shopId: string): Promise<FeaturesState> {
  const existing = inFlightRequests.get(shopId);
  if (existing) return existing;

  const request = sellerSubscriptionsApi
    .getMyFeatures()
    .then((res) => buildFeaturesState(res.data ?? {}))
    .finally(() => {
      inFlightRequests.delete(shopId);
    });
  inFlightRequests.set(shopId, request);
  return request;
}

/**
 * Hook that fetches the current active shop's plan features.
 * Provides `hasFeature(key)` for quick boolean checks.
 *
 * Features are loaded from `GET /seller-subscriptions/my-features`
 * which reads the LIVE plan record — so admin edits to a plan's
 * features JSON take effect on refresh/focus. Requests are de-duplicated
 * across layout/page consumers but never cached across active-shop changes.
 */
export function useFeatures() {
  const { user } = useAuth();
  const [state, setState] = useState<FeaturesState | null>(null);
  const [status, setStatus] = useState<FeaturesStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const stateRef = useRef<FeaturesState | null>(null);
  const shopId = user?.role === "SHOPKEEPER" ? user.shop?.id : undefined;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!shopId) {
      stateRef.current = null;
      setState(null);
      setError(null);
      setStatus("idle");
      return false;
    }

    const requestId = ++requestIdRef.current;
    setStatus(stateRef.current ? "refreshing" : "loading");
    setError(null);
    try {
      const next = await fetchFeatures(shopId);
      if (requestId !== requestIdRef.current) return false;
      stateRef.current = next;
      setState(next);
      setStatus("ready");
      return true;
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return false;
      setError(featureLoadError(loadError));
      setStatus("error");
      return false;
    }
  }, [shopId]);

  useEffect(() => {
    requestIdRef.current += 1;
    stateRef.current = null;
    setState(null);
    setError(null);
    if (!shopId) {
      setStatus("idle");
      return;
    }
    void refresh();
    return () => {
      requestIdRef.current += 1;
    };
  }, [shopId, refresh]);

  useEffect(() => {
    if (!shopId || typeof window === "undefined") return;
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [shopId, refresh]);

  /** Returns true only when the live resolved plan enables the feature. */
  const hasFeature = useCallback(
    (key: string): boolean => state?.map[key] === true,
    [state],
  );

  return {
    /** All features with metadata */
    features: state?.features ?? [],
    /** Resolved live plan name (e.g. "Enterprise (UAE)") */
    planName: state?.planName ?? null,
    /** Resolved live plan id */
    planId: state?.planId ?? null,
    /** Check if a specific feature is enabled */
    hasFeature,
    /** True only for the first load; refreshes preserve rendered access */
    loading: status === "loading",
    /** True while a focus/manual refresh is in flight */
    refreshing: status === "refreshing",
    /** idle/loading/refreshing/ready/error */
    status,
    /** A load failure is distinct from a plan denying the feature */
    error,
    lastUpdatedAt: state?.lastUpdatedAt ?? null,
    /** Force refresh features (e.g. after subscription/admin change) */
    refresh,
  };
}
