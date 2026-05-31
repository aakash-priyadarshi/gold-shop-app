"use client";

import { useAuth } from "@/hooks/useAuth";
import { sellerSubscriptionsApi } from "@/lib/api";
import type { ConversionSignals } from "@/lib/conversion-nudges";
import { useEffect, useRef, useState } from "react";

/**
 * Fetches the shop's conversion signals (usage + trial state) once per session.
 * Only runs for SHOPKEEPER users. Fails silently — no signals => no nudge.
 */
export function useConversionSignals() {
  const { user } = useAuth();
  const [signals, setSignals] = useState<ConversionSignals | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!user || user.role !== "SHOPKEEPER" || fetchedRef.current) {
      setLoading(false);
      return;
    }

    fetchedRef.current = true;
    sellerSubscriptionsApi
      .getConversionSignals()
      .then((res) => {
        if (res.data) setSignals(res.data as ConversionSignals);
      })
      .catch(() => {
        // Silently ignore — nudges are non-critical.
      })
      .finally(() => setLoading(false));
  }, [user]);

  return { signals, loading };
}
