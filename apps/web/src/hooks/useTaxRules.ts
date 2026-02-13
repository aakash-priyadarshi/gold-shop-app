/**
 * useTaxRules - Hook for fetching dynamic, category-specific tax rules
 *
 * Fetches tax rules from the backend for a given country code,
 * providing category-specific tax calculation.
 *
 * Example:
 *   const { taxRules, calculateTax, getTaxBreakdown, loading } = useTaxRules("NP");
 *   const metalTax = calculateTax(metalValue, "PRECIOUS_METAL");
 *   const breakdown = getTaxBreakdown({ metal: 100000, making: 5000, gemstone: 20000 });
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiUrl } from "@/lib/api";

export interface TaxRule {
  id: string;
  taxType: string;
  taxName: string;
  category: string;
  rate: number;
  priority: number;
  description: string | null;
  isActive: boolean;
}

interface TaxRulesResponse {
  region: string;
  source: "DB" | "DEFAULT";
  rules: TaxRule[];
}

export type TaxCategory =
  | "ALL"
  | "PRECIOUS_METAL"
  | "MAKING_CHARGE"
  | "GEMSTONE"
  | "FINISH";

export interface TaxBreakdownInput {
  metal?: number;
  making?: number;
  gemstone?: number;
  finish?: number;
}

export interface TaxLineItem {
  taxName: string;
  taxType: string;
  category: string;
  rate: number;
  baseAmount: number;
  taxAmount: number;
}

export interface TaxBreakdownResult {
  lineItems: TaxLineItem[];
  totalTax: number;
  subtotal: number;
  grandTotal: number;
}

// Simple in-memory cache to avoid refetching on every component mount
const cache: Record<string, { data: TaxRulesResponse; ts: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Standalone function to fetch tax rules for a country (with cache).
 * Use this when you need rules for multiple countries or outside a hook.
 */
export async function fetchTaxRules(
  countryCode: string,
): Promise<TaxRulesResponse | null> {
  const region = countryCode.toUpperCase();
  const cached = cache[region];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }
  try {
    const res = await fetch(`${getApiUrl()}/pricing/tax-rules?region=${region}`);
    if (!res.ok) return null;
    const data: TaxRulesResponse = await res.json();
    cache[region] = { data, ts: Date.now() };
    return data;
  } catch {
    return null;
  }
}

/**
 * Standalone helper: given tax rules and a category, return the rate + display name.
 * Useful in loops where you can't call hooks.
 */
export function lookupTaxRate(
  rules: TaxRule[],
  category: TaxCategory = "ALL",
): { rate: number; name: string } {
  const active = rules.filter((r) => r.isActive !== false);
  const specific = active.find((r) => r.category === category);
  if (specific) return { rate: specific.rate, name: specific.taxName };
  const allRule = active.find((r) => r.category === "ALL");
  if (allRule) return { rate: allRule.rate, name: allRule.taxName };
  return { rate: 0, name: "Tax" };
}

export function useTaxRules(countryCode: string | undefined) {
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [source, setSource] = useState<"DB" | "DEFAULT">("DEFAULT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const region = countryCode?.toUpperCase() || "";

  useEffect(() => {
    if (!region) return;

    const cached = cache[region];
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setTaxRules(cached.data.rules);
      setSource(cached.data.source);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${getApiUrl()}/pricing/tax-rules?region=${region}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch tax rules");
        return res.json();
      })
      .then((data: TaxRulesResponse) => {
        if (cancelled) return;
        cache[region] = { data, ts: Date.now() };
        setTaxRules(data.rules || []);
        setSource(data.source || "DEFAULT");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Tax rules fetch error:", err);
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [region]);

  /**
   * Get the applicable tax rate for a specific category.
   * Falls back to "ALL" category rules if no category-specific rule exists.
   */
  const getRateForCategory = useCallback(
    (category: TaxCategory): number => {
      const activeRules = taxRules.filter((r) => r.isActive !== false);

      // Look for a category-specific rule first
      const specific = activeRules.find((r) => r.category === category);
      if (specific) return specific.rate;

      // Fall back to "ALL"
      const allRule = activeRules.find((r) => r.category === "ALL");
      if (allRule) return allRule.rate;

      return 0;
    },
    [taxRules],
  );

  /**
   * Calculate tax on a single amount for a given category
   */
  const calculateTax = useCallback(
    (amount: number, category: TaxCategory = "ALL"): number => {
      const rate = getRateForCategory(category);
      return Math.round(amount * rate * 100) / 100;
    },
    [getRateForCategory],
  );

  /**
   * Get the display name for the primary tax of a category
   */
  const getTaxDisplayName = useCallback(
    (category: TaxCategory = "ALL"): string => {
      const activeRules = taxRules.filter((r) => r.isActive !== false);
      const specific = activeRules.find((r) => r.category === category);
      if (specific) return specific.taxName;

      const allRule = activeRules.find((r) => r.category === "ALL");
      if (allRule) return allRule.taxName;

      return "Tax";
    },
    [taxRules],
  );

  /**
   * Get full tax breakdown for an item with multiple components
   * (metal value, making charge, gemstone value, finish cost)
   */
  const getTaxBreakdown = useCallback(
    (input: TaxBreakdownInput): TaxBreakdownResult => {
      const activeRules = taxRules.filter((r) => r.isActive !== false);
      const lineItems: TaxLineItem[] = [];

      const componentMap: Record<TaxCategory, number> = {
        PRECIOUS_METAL: input.metal || 0,
        MAKING_CHARGE: input.making || 0,
        GEMSTONE: input.gemstone || 0,
        FINISH: input.finish || 0,
        ALL: 0, // will be calculated
      };

      const subtotal = Object.values(componentMap).reduce((a, b) => a + b, 0);

      // Sort rules by priority
      const sorted = [...activeRules].sort(
        (a, b) => (a.priority || 999) - (b.priority || 999),
      );

      for (const rule of sorted) {
        let baseAmount = 0;

        if (rule.category === "ALL") {
          // Apply to full subtotal
          baseAmount = subtotal;
        } else {
          baseAmount = componentMap[rule.category as TaxCategory] || 0;
        }

        if (baseAmount <= 0) continue;

        const taxAmount = Math.round(baseAmount * rule.rate * 100) / 100;

        lineItems.push({
          taxName: rule.taxName,
          taxType: rule.taxType,
          category: rule.category,
          rate: rule.rate,
          baseAmount,
          taxAmount,
        });
      }

      const totalTax = lineItems.reduce((sum, li) => sum + li.taxAmount, 0);

      return {
        lineItems,
        totalTax,
        subtotal,
        grandTotal: subtotal + totalTax,
      };
    },
    [taxRules],
  );

  /**
   * Simple flat rate - weighted average across all active rules.
   * Useful as a simple fallback when component breakdown isn't available.
   */
  const effectiveRate = useMemo(() => {
    const activeRules = taxRules.filter((r) => r.isActive !== false);
    if (activeRules.length === 0) return 0;

    // If there's an ALL rule, use that rate
    const allRule = activeRules.find((r) => r.category === "ALL");
    if (allRule) return allRule.rate;

    // Otherwise, average the specific rates (rough approximation)
    const totalRate = activeRules.reduce((sum, r) => sum + r.rate, 0);
    return totalRate / activeRules.length;
  }, [taxRules]);

  /**
   * Get a display string like "Luxury Tax (2%)" for the primary tax
   */
  const taxDisplayString = useMemo(() => {
    const activeRules = taxRules.filter((r) => r.isActive !== false);
    if (activeRules.length === 0) return "Tax (0%)";

    // If single rule, show it
    if (activeRules.length === 1) {
      const r = activeRules[0];
      return `${r.taxName} (${(r.rate * 100).toFixed((r.rate * 100) % 1 === 0 ? 0 : 1)}%)`;
    }

    // Multiple rules, show count
    return `${activeRules.length} tax rules`;
  }, [taxRules]);

  return {
    taxRules,
    source,
    loading,
    error,
    calculateTax,
    getRateForCategory,
    getTaxDisplayName,
    getTaxBreakdown,
    effectiveRate,
    taxDisplayString,
  };
}
