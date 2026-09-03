"use client";

import { useAuth } from "@/hooks/useAuth";
import { materialsApi } from "@/lib/api";
import {
  parseMarketRatesPayload,
  type ParsedMarketRates,
} from "@/lib/market-rates";
import { getShopMarketParams } from "@/lib/mobileCurrency";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useShopMarketRates(options?: { refreshMs?: number }) {
  const { user } = useAuth();
  const shop = user?.shop ?? null;
  const params = useMemo(() => getShopMarketParams(shop), [shop]);
  const country = params?.country ?? null;
  const currency = params?.currency ?? null;
  const refreshMs = options?.refreshMs;
  const [rates, setRates] = useState<ParsedMarketRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchRates = useCallback(async () => {
    if (!country || !currency) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await materialsApi.getMarketRates({ country, currency });
      if (requestId !== requestIdRef.current) return;
      const parsed = parseMarketRatesPayload(res.data);
      setRates(parsed);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to fetch rates");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [country, currency]);

  useEffect(() => {
    if (!country || !currency) {
      setRates(null);
      return;
    }
    fetchRates();
    if (!refreshMs) return;
    const interval = setInterval(fetchRates, refreshMs);
    return () => clearInterval(interval);
  }, [country, currency, fetchRates, refreshMs]);

  return {
    rates,
    loading,
    error,
    refresh: fetchRates,
    params: params,
    ready: Boolean(params),
  };
}
