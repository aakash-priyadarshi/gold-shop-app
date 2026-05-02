"use client";

import { platformConfigApi } from "@/lib/api";
import { useEffect, useState } from "react";

export interface PlatformFeatures {
  customerFlowEnabled: boolean;
}

const DEFAULTS: PlatformFeatures = {
  customerFlowEnabled: false,
};

// Module-level cache to avoid re-fetching on every component mount
let cachedFeatures: PlatformFeatures | null = null;
let inFlight: Promise<PlatformFeatures> | null = null;

async function fetchFeatures(): Promise<PlatformFeatures> {
  if (cachedFeatures) return cachedFeatures;
  if (inFlight) return inFlight;

  inFlight = platformConfigApi
    .getPublic()
    .then((res) => {
      const features = res.data?.data?.features ?? {};
      const result: PlatformFeatures = {
        customerFlowEnabled: features.customerFlowEnabled === true,
      };
      cachedFeatures = result;
      return result;
    })
    .catch(() => DEFAULTS)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * Hook to read public platform-wide feature flags
 * (e.g. customer flow on/off). Cached at module level.
 */
export function usePlatformFeatures(): {
  features: PlatformFeatures;
  loading: boolean;
} {
  const [features, setFeatures] = useState<PlatformFeatures>(
    cachedFeatures ?? DEFAULTS,
  );
  const [loading, setLoading] = useState(!cachedFeatures);

  useEffect(() => {
    if (cachedFeatures) {
      setFeatures(cachedFeatures);
      setLoading(false);
      return;
    }
    let mounted = true;
    fetchFeatures().then((f) => {
      if (mounted) {
        setFeatures(f);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { features, loading };
}

/** Clear the cache — call after admin updates flags */
export function invalidatePlatformFeatures() {
  cachedFeatures = null;
}
