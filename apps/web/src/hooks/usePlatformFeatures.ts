"use client";

import { platformConfigApi } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface PlatformFeatures {
  customerFlowEnabled: boolean;
}

const DEFAULTS: PlatformFeatures = {
  customerFlowEnabled: false,
};

export const PLATFORM_FEATURES_KEY = ["platform-features"] as const;

async function fetchFeatures(): Promise<PlatformFeatures> {
  const res = await platformConfigApi.getPublic();
  const features = res.data?.data?.features ?? {};
  return {
    customerFlowEnabled: features.customerFlowEnabled === true,
  };
}

/**
 * Hook to read public platform-wide feature flags (e.g. the global customer
 * marketplace kill-switch).
 *
 * Backed by React Query so the value is shared across every consumer, bounded
 * in staleness, and revalidated when the tab regains focus. This matters
 * because `customerFlowEnabled` is a global gate: when an admin flips it, other
 * already-open sessions must converge quickly rather than serving an
 * indefinitely cached value (the old module-level cache had no TTL).
 */
export function usePlatformFeatures(): {
  features: PlatformFeatures;
  loading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: PLATFORM_FEATURES_KEY,
    queryFn: fetchFeatures,
    // Bound staleness for a global kill-switch: refetch in the background and
    // when the tab is refocused so other sessions converge within ~30-60s.
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: DEFAULTS,
  });

  return { features: data ?? DEFAULTS, loading: isLoading };
}

/**
 * Returns an invalidator that forces an immediate refresh of the platform
 * feature flags. Call it right after an admin successfully updates a flag so
 * their own tab reflects the change instantly; other sessions converge via the
 * staleTime / refetchInterval above.
 */
export function useInvalidatePlatformFeatures(): () => void {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: PLATFORM_FEATURES_KEY });
}
