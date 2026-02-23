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

interface FeaturesState {
  planName: string;
  planId: string | null;
  features: PlanFeature[];
  /** Fast lookup: pass a feature key, get true/false */
  map: Record<string, boolean>;
}

/**
 * Hook that fetches and caches the current shop's plan features.
 * Provides `hasFeature(key)` for quick boolean checks.
 *
 * Features are loaded from `GET /seller-subscriptions/my-features`
 * which reads the LIVE plan record — so admin edits to a plan's
 * features JSON take effect immediately for all subscribers.
 */
export function useFeatures() {
  const { user } = useAuth();
  const [state, setState] = useState<FeaturesState | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!user || user.role !== "SHOPKEEPER" || fetchedRef.current) {
      setLoading(false);
      return;
    }

    fetchedRef.current = true;
    sellerSubscriptionsApi
      .getMyFeatures()
      .then((res) => {
        const data = res.data;
        if (data && data.features) {
          const map: Record<string, boolean> = {};
          for (const f of data.features) {
            map[f.key] = f.enabled;
          }
          setState({
            planName: data.planName,
            planId: data.planId,
            features: data.features,
            map,
          });
        }
      })
      .catch(() => {
        // Silently fail — features will default to false
      })
      .finally(() => setLoading(false));
  }, [user]);

  /** Returns true if the feature is enabled on the current plan */
  const hasFeature = useCallback(
    (key: string): boolean => {
      if (!state) return false;
      return state.map[key] === true;
    },
    [state],
  );

  /** Refresh features (e.g. after plan change) */
  const refresh = useCallback(async () => {
    try {
      const res = await sellerSubscriptionsApi.getMyFeatures();
      const data = res.data;
      if (data && data.features) {
        const map: Record<string, boolean> = {};
        for (const f of data.features) {
          map[f.key] = f.enabled;
        }
        setState({
          planName: data.planName,
          planId: data.planId,
          features: data.features,
          map,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  return {
    /** All features with metadata */
    features: state?.features ?? [],
    /** Plan name (e.g. "Free Plan", "Pro Plan") */
    planName: state?.planName ?? null,
    /** Check if a specific feature is enabled */
    hasFeature,
    /** Whether features are still loading */
    loading,
    /** Force refresh features (e.g. after subscription change) */
    refresh,
  };
}
