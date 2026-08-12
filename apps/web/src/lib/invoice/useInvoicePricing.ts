"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveWastageRule, type ResolvedWastageRule } from "@gold-shop/shared";
import { getApiUrl, pricingApi, shopsApi } from "@/lib/api";
import {
  applyMakingToLine,
  computeDiscountAmount,
  computeGrandTotal,
  computeSubtotal,
  computeTaxBreakdown,
  computeWastageTotal,
  gemstoneTotal,
  recalcLineWastage,
} from "./calculateLineTotals";
import {
  emptyLineItem,
  FALLBACK_CATEGORY_TAX_RATES,
  type CountryTaxConfig,
  type RichLineItem,
} from "./lineItemTypes";
import {
  buildMetalPartsFromCatalogItem,
  calcMetalCostFromParts,
  importCatalogItem,
  importShopQuote,
  type CatalogImportResult,
} from "./importHelpers";

export type MakingMode = "PERCENT" | "PER_GRAM" | "FIXED";

export type LiveRateData = { metals?: Record<string, number> };

export interface UseInvoicePricingOptions {
  invoiceCountry: string;
  shopCountry: string;
  shopCurrency: string;
  shopId?: string;
  discountType?: "PERCENT" | "FIXED";
  discountValue?: string;
}

export interface ApplyMakingResult {
  ok: boolean;
  message?: string;
}

export function useInvoicePricing(opts: UseInvoicePricingOptions) {
  const {
    invoiceCountry,
    shopCountry,
    shopCurrency,
    shopId,
    discountType = "FIXED",
    discountValue = "",
  } = opts;

  const [lineItems, setLineItems] = useState<RichLineItem[]>([emptyLineItem()]);
  const [wastagePct, setWastagePct] = useState("");
  const [shopWastageMode, setShopWastageMode] = useState("AUTO");
  const [shopWastagePercent, setShopWastagePercent] = useState<number | null>(
    null,
  );
  const [countryTax, setCountryTax] = useState<CountryTaxConfig>(
    FALLBACK_CATEGORY_TAX_RATES[invoiceCountry] ||
      FALLBACK_CATEGORY_TAX_RATES.NP,
  );
  const [marketRates, setMarketRates] = useState<LiveRateData | null>(null);
  const [marketRatesLoading, setMarketRatesLoading] = useState(false);
  const [shopPrices, setShopPrices] = useState<{
    baseMetalPrices?: Record<string, number>;
  } | null>(null);
  const [useLiveRate, setUseLiveRate] = useState(true);
  const [makingMode, setMakingMode] = useState<MakingMode>("PERCENT");
  const [makingValue, setMakingValue] = useState("15");

  const wastagePercentTouched = useRef(false);
  const prevInvoiceCountry = useRef(invoiceCountry);

  const wastageRule: ResolvedWastageRule = useMemo(
    () =>
      resolveWastageRule(invoiceCountry, {
        billingWastageMode: shopWastageMode,
        billingWastagePercent: shopWastagePercent,
      }),
    [invoiceCountry, shopWastageMode, shopWastagePercent],
  );

  const effectiveWastagePercent = useMemo(() => {
    const override = parseFloat(wastagePct);
    if (wastagePct !== "" && Number.isFinite(override)) {
      return Math.max(0, override);
    }
    return wastageRule.percent;
  }, [wastagePct, wastageRule.percent]);

  const invoiceWastagePct = effectiveWastagePercent;

  const resolveInvoiceWastagePct = useCallback(() => {
    const parsed = parseFloat(wastagePct);
    if (wastagePct !== "" && Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
    return Math.max(0, effectiveWastagePercent);
  }, [wastagePct, effectiveWastagePercent]);

  const wastageInputKey = useMemo(
    () =>
      lineItems
        .map(
          (li) =>
            `${li.metalCost}|${li.metalWeightG}|${li.quantity}|${li.baseWastagePercent ?? ""}|${li.source ?? ""}|${li.wastagePercent ?? ""}`,
        )
        .join(";"),
    [lineItems],
  );

  const fetchMarketRates = useCallback(async () => {
    setMarketRatesLoading(true);
    try {
      const res = await fetch(
        `${getApiUrl()}/market-rates?country=${shopCountry}&currency=${shopCurrency}`,
      );
      if (res.ok) {
        setMarketRates(await res.json());
      }
    } catch {
      /* optional */
    } finally {
      setMarketRatesLoading(false);
    }
  }, [shopCountry, shopCurrency]);

  useEffect(() => {
    void fetchMarketRates();
  }, [fetchMarketRates]);

  useEffect(() => {
    let cancelled = false;
    shopsApi
      .getComponentPricing()
      .then((res) => {
        if (cancelled) return;
        const cp = res.data;
        if (cp?.baseMetalPrices && Object.keys(cp.baseMetalPrices).length > 0) {
          setShopPrices({ baseMetalPrices: cp.baseMetalPrices });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    shopsApi
      .getSettings()
      .then((res) => {
        if (cancelled) return;
        const shop = res.data?.shop || res.data;
        if (!shop) return;
        setShopWastageMode(shop.billingWastageMode || "AUTO");
        setShopWastagePercent(
          shop.billingWastagePercent == null
            ? null
            : Number(shop.billingWastagePercent),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!wastagePercentTouched.current) {
      setWastagePct(
        wastageRule.mode === "DISABLED" ? "" : String(wastageRule.percent),
      );
    }
  }, [wastageRule.mode, wastageRule.percent]);

  useEffect(() => {
    if (prevInvoiceCountry.current === invoiceCountry) return;
    prevInvoiceCountry.current = invoiceCountry;
    wastagePercentTouched.current = false;
    setLineItems((prev) =>
      prev.map((li) => ({ ...li, wastageCost: "", wastagePercent: "" })),
    );
  }, [invoiceCountry]);

  useEffect(() => {
    let cancelled = false;
    pricingApi
      .getTaxRules(invoiceCountry === "GB" ? "UK" : invoiceCountry)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || res.data;
        if (data?.rates) {
          setCountryTax({
            taxType: data.taxType || "TAX",
            taxName: data.taxName || "Tax",
            rates: {
              PRECIOUS_METAL: Number(
                data.rates.PRECIOUS_METAL ?? data.rates.metal ?? 0,
              ),
              MAKING_CHARGE: Number(
                data.rates.MAKING_CHARGE ?? data.rates.making ?? 0,
              ),
              GEMSTONE: Number(data.rates.GEMSTONE ?? data.rates.gemstone ?? 0),
              FINISH: Number(data.rates.FINISH ?? data.rates.finish ?? 0),
            },
            defaultRate: Number(
              data.defaultRate ?? data.rates.PRECIOUS_METAL ?? 0,
            ),
          });
        } else {
          setCountryTax(
            FALLBACK_CATEGORY_TAX_RATES[invoiceCountry] ||
              FALLBACK_CATEGORY_TAX_RATES.NP,
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCountryTax(
            FALLBACK_CATEGORY_TAX_RATES[invoiceCountry] ||
              FALLBACK_CATEGORY_TAX_RATES.NP,
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceCountry]);

  useEffect(() => {
    const pct = resolveInvoiceWastagePct();
    setLineItems((prev) => {
      let changed = false;
      const next = prev.map((li) => {
        const updated = recalcLineWastage(li, pct, wastageRule);
        if (
          (updated.wastageCost || "") !== (li.wastageCost || "") ||
          (updated.wastagePercent || "") !== (li.wastagePercent || "")
        ) {
          changed = true;
        }
        return updated;
      });
      return changed ? next : prev;
    });
  }, [
    wastagePct,
    resolveInvoiceWastagePct,
    wastageInputKey,
    wastageRule,
  ]);

  const tryLiveMetalCost = useCallback(
    (line: RichLineItem, patch: Partial<RichLineItem>): string | undefined => {
      if (!useLiveRate) return patch.metalCost;
      const metalType = patch.metalType ?? line.metalType;
      const weightG =
        parseFloat(patch.metalWeightG ?? line.metalWeightG) || 0;
      if (!metalType || weightG <= 0) return patch.metalCost;

      const parts =
        line.metalParts && line.metalParts.length > 0
          ? line.metalParts.map((p) =>
              patch.metalWeightG && line.metalParts?.length === 1
                ? { ...p, weightG }
                : p,
            )
          : [{ metalType, weightG }];

      const { cost } = calcMetalCostFromParts(
        parts,
        shopPrices,
        marketRates,
      );
      return cost > 0 ? String(cost) : patch.metalCost;
    },
    [useLiveRate, shopPrices, marketRates],
  );

  const updateLine = useCallback(
    (index: number, patch: Partial<RichLineItem>) => {
      setLineItems((current) =>
        current.map((line, i) => {
          if (i !== index) return line;
          let next = { ...line, ...patch };

          if (
            useLiveRate &&
            (patch.metalType !== undefined || patch.metalWeightG !== undefined)
          ) {
            const liveCost = tryLiveMetalCost(line, patch);
            if (liveCost !== undefined) {
              next.metalCost = liveCost;
            }
          }

          if (
            patch.metalCost !== undefined ||
            patch.metalWeightG !== undefined ||
            patch.wastagePercent !== undefined ||
            patch.metalType !== undefined
          ) {
            next = recalcLineWastage(
              next,
              resolveInvoiceWastagePct(),
              wastageRule,
            );
          }
          return next;
        }),
      );
    },
    [
      useLiveRate,
      tryLiveMetalCost,
      resolveInvoiceWastagePct,
      wastageRule,
    ],
  );

  const applyMakingOnLine = useCallback(
    (index: number): ApplyMakingResult => {
      const line = lineItems[index];
      if (!line) return { ok: false, message: "Line not found" };

      const value = Number(makingValue) || 0;
      if (value <= 0) {
        return { ok: false, message: "Enter a making value greater than 0" };
      }

      const metal = parseFloat(line.metalCost) || 0;
      const gems = gemstoneTotal(line);
      const weight = parseFloat(line.metalWeightG) || 0;

      if (makingMode === "PERCENT" && metal <= 0 && gems <= 0) {
        return {
          ok: false,
          message: "Enter metal or gemstone cost before applying % making",
        };
      }
      if (makingMode === "PER_GRAM" && weight <= 0) {
        return { ok: false, message: "Enter weight before applying per-gram making" };
      }

      setLineItems((current) =>
        current.map((l, i) =>
          i === index ? applyMakingToLine(l, makingMode, value) : l,
        ),
      );
      return { ok: true };
    },
    [lineItems, makingMode, makingValue],
  );

  const setWastagePctTouched = useCallback((value: string) => {
    wastagePercentTouched.current = true;
    setWastagePct(value);
  }, []);

  const addFromCatalog = useCallback(
    async (
      item: any,
    ): Promise<
      | { ok: true; result: CatalogImportResult & { nextLines: RichLineItem[] } }
      | { ok: false; error: string }
    > => {
      if (!shopId) {
        return { ok: false, error: "Shop not loaded" };
      }

      let liveMetalCost: number | undefined;
      let liveDetail: string | undefined;

      if (useLiveRate) {
        try {
          const bulk = await pricingApi.resolveBulk(shopId, [item.id]);
          const price =
            bulk.data?.prices?.[item.id] ||
            bulk.data?.items?.[item.id] ||
            bulk.data?.[item.id];
          if (price?.metalCost != null) {
            liveMetalCost = Number(price.metalCost);
            liveDetail = "Live rate (bulk)";
          } else if (price?.effectiveTotal != null) {
            liveMetalCost = Number(price.effectiveTotal);
            liveDetail = "Live rate (total)";
          }
        } catch {
          /* fall through to parts calc */
        }
      }

      const imported = importCatalogItem({
        item,
        existingLines: lineItems,
        liveMetalCost,
        liveDetail,
        shopWastagePercent: effectiveWastagePercent,
        shopPrices,
        marketRates,
        useLiveRate,
      });

      if ("error" in imported) {
        return { ok: false, error: imported.error };
      }

      let line = imported.line;

      if (
        useLiveRate &&
        item.composition?.gemstones?.length > 0 &&
        shopId
      ) {
        try {
          const gems = [];
          let gemTotal = 0;
          for (const gem of item.composition.gemstones) {
            const res = await pricingApi.resolveGemstone({
              shopId,
              stoneType: gem.type || "OTHER",
              caratWeight: gem.caratWeight || undefined,
              sizeMm: gem.sizeMm || undefined,
              quality: gem.quality || "STANDARD",
              origin: gem.origin || "NATURAL",
              count: gem.count || 1,
            });
            const cost = Number(res.data?.totalCost ?? res.data?.cost ?? 0);
            gemTotal += cost;
            gems.push({
              type: String(gem.type || "GEMSTONE"),
              cut: String(gem.cut || ""),
              clarity: String(gem.clarity || ""),
              caratWeight:
                gem.caratWeight != null ? String(gem.caratWeight) : "",
              color: String(gem.color || ""),
              cost: cost > 0 ? String(cost) : String(gem.cost ?? ""),
            });
          }
          if (gems.length > 0) {
            line = { ...line, gemstones: gems };
          }
          if (gemTotal > 0 && parseFloat(line.makingCost || "") > 0) {
            const mc = parseFloat(line.metalCost) || 0;
            const makingNum = parseFloat(line.makingCost) || 0;
            if (mc > 0) {
              setMakingValue(String(Math.round((makingNum / (mc + gemTotal)) * 10000) / 100));
            }
          }
        } catch {
          /* keep catalog gemstone values */
        }
      }

      const pct = resolveInvoiceWastagePct();
      const syncedLine = recalcLineWastage(line, pct, wastageRule);
      const nextLines = [
        ...imported.nextLines.filter((l) => l !== imported.line),
        syncedLine,
      ];

      setLineItems(nextLines);
      if (imported.wastagePercent != null && !wastagePercentTouched.current) {
        setWastagePct(String(imported.wastagePercent));
      }

      return {
        ok: true,
        result: { ...imported, line: syncedLine, nextLines },
      };
    },
    [
      shopId,
      useLiveRate,
      lineItems,
      effectiveWastagePercent,
      shopPrices,
      marketRates,
      resolveInvoiceWastagePct,
      wastageRule,
    ],
  );

  const mergeQuoteImport = useCallback(
    (quote: any) => {
      const imported = importShopQuote(quote);
      const pct = resolveInvoiceWastagePct();
      const line = recalcLineWastage(imported.line, pct, wastageRule);
      setLineItems([line]);
      if (imported.wastagePercent != null && !wastagePercentTouched.current) {
        setWastagePct(String(imported.wastagePercent));
      }
      return { ...imported, line };
    },
    [resolveInvoiceWastagePct, wastageRule],
  );

  const subtotal = useMemo(() => computeSubtotal(lineItems), [lineItems]);
  const wastageTotal = useMemo(
    () => computeWastageTotal(lineItems, invoiceWastagePct, wastageRule),
    [lineItems, invoiceWastagePct, wastageRule],
  );
  const taxBreakdown = useMemo(
    () =>
      computeTaxBreakdown({
        lineItems,
        countryTax,
        makingChargeAmount: 0,
        invoiceWastagePct,
        wastageRule,
      }),
    [lineItems, countryTax, invoiceWastagePct, wastageRule],
  );
  const discountAmount = useMemo(
    () =>
      computeDiscountAmount(
        subtotal + wastageTotal,
        discountType,
        Number(discountValue) || 0,
      ),
    [subtotal, wastageTotal, discountType, discountValue],
  );
  const grandTotal = useMemo(
    () =>
      computeGrandTotal({
        subtotal,
        makingChargeAmount: 0,
        wastageTotal,
        taxTotal: taxBreakdown.totalTax,
        discountAmount,
      }),
    [subtotal, wastageTotal, taxBreakdown.totalTax, discountAmount],
  );

  return {
    lineItems,
    setLineItems,
    wastagePct,
    setWastagePct: setWastagePctTouched,
    wastageRule,
    effectiveWastagePercent,
    invoiceWastagePct,
    countryTax,
    marketRates,
    marketRatesLoading,
    shopPrices,
    useLiveRate,
    setUseLiveRate,
    makingMode,
    setMakingMode,
    makingValue,
    setMakingValue,
    updateLine,
    applyMakingOnLine,
    addFromCatalog,
    mergeQuoteImport,
    refreshMarketRates: fetchMarketRates,
    subtotal,
    wastageTotal,
    taxBreakdown,
    discountAmount,
    grandTotal,
    buildMetalPartsFromCatalogItem,
  };
}
