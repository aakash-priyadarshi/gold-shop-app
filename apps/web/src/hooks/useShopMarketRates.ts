"use client";

import { useAuth } from "@/hooks/useAuth";
import { materialsApi } from "@/lib/api";
import {
  parseMarketRatesPayload,
  type ParsedMarketRates,
} from "@/lib/market-rates";
import { getShopMarketParams } from "@/lib/mobileCurrency";
import { useCallback, useEffect, useRef, useState } from "react";

export function useShopMarketRates(options?: { refreshMs?: number }) {
  const { user } = useAuth();
  const params = getShopMarketParams(user?.shop ?? null);
  const country = params?.country ?? null;
  const currency = params?.currency ?? null;
  const [rates, setRates] = useState<ParsedMarketRates | null>(null);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  const fetchRates = useCallback(async () => {
    if (!country || !currency) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const res = await materialsApi.getMarketRates({ country, currency });
      if (requestId !== requestIdRef.current) return;
      const parsed = parseMarketRatesPayload(res.data);
      setRates(parsed);
    } catch {
      if (requestId !== requestIdRef.current) return;
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
    if (!options?.refreshMs) return;
    const interval = setInterval(fetchRates, options.refreshMs);
    return () => clearInterval(interval);
  }, [country, currency, fetchRates, options?.refreshMs]);

  return {
    rates,
    loading,
    refresh: fetchRates,
    params: params,
    ready: Boolean(params),
  };
}
