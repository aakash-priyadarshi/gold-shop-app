/**
 * RFQ Pricing Integration Hooks
 * 
 * Helper hooks and utilities to integrate the new pricing components
 * into the existing RFQ create page with minimal disruption.
 */

import { useState, useEffect, useCallback } from 'react';
import { GemstoneEntry as NewGemstoneEntry } from '@/components/pricing/GemstoneEditor';
import { usePreferencesStore } from '@/store/preferences';
import { getApiUrl } from '@/lib/api';

const API_URL = getApiUrl();

// ═══════════════════════════════════════════
// TYPE CONVERSIONS
// ═══════════════════════════════════════════

// Legacy gemstone entry (from old form)
export interface LegacyGemstoneEntry {
  presetId: string;
  stoneType: string;
  shape: string;
  size: string;
  colour: string;
  settingStyle: string;
  count: number;
}

/**
 * Convert new GemstoneEntry to legacy format for backwards compatibility
 */
export function convertToLegacyGemstone(gem: NewGemstoneEntry): LegacyGemstoneEntry {
  return {
    presetId: 'custom',
    stoneType: gem.stoneType,
    shape: gem.shape,
    size: gem.sizeUnit === 'CARAT' ? `${gem.sizeValue}ct` : `${gem.sizeValue}mm`,
    colour: gem.color || '',
    settingStyle: gem.settingStyle,
    count: gem.count,
  };
}

/**
 * Convert legacy gemstone to new format
 */
export function convertFromLegacyGemstone(legacy: LegacyGemstoneEntry): NewGemstoneEntry {
  // Parse size string like "5mm" or "0.5ct"
  const sizeMatch = legacy.size.match(/^([\d.]+)(mm|ct)?$/i);
  const sizeValue = sizeMatch ? parseFloat(sizeMatch[1]) : 1;
  const sizeUnit = legacy.size.toLowerCase().includes('ct') ? 'CARAT' : 'MM';

  return {
    id: `gem-${Date.now()}`,
    stoneType: legacy.stoneType,
    origin: determineOrigin(legacy.stoneType),
    shape: legacy.shape || 'ROUND',
    sizeValue: String(sizeValue),
    sizeUnit,
    color: legacy.colour,
    clarity: undefined,
    cut: undefined,
    settingStyle: legacy.settingStyle || 'PRONG',
    count: legacy.count || 1,
  };
}

function determineOrigin(stoneType: string): 'NATURAL' | 'LAB' {
  const labStones = ['MOISSANITE', 'CUBIC_ZIRCONIA', 'DIAMOND_LAB'];
  return labStones.some(s => stoneType.toUpperCase().includes(s)) ? 'LAB' : 'NATURAL';
}

// ═══════════════════════════════════════════
// PRICING HOOKS
// ═══════════════════════════════════════════

export interface PriceEstimateResponse {
  metalCost: number;
  makingCharge: number;
  platingCost: number;
  gemstoneCost: number;
  finishCost: number;
  subtotal: number;
  tax: number;
  taxBreakdown?: { name: string; rate: number; amount: number }[];
  platformFee: number;
  total: number;
  breakdown: {
    metalType: string;
    weightGrams: number;
    ratePerGram: number;
    makingChargePercent: number;
  };
  displayCurrency: string;
  marketCountry: string;
  warnings?: { code: string; message: string; severity: 'info' | 'warning' | 'error' }[];
}

export interface SellerPrice {
  shopId: string;
  shopName: string;
  country: string;
  city: string;
  rating: number;
  totalPrice: number;
  metalCost: number;
  makingCharge: number;
  gemstoneCost: number;
  finishCost: number;
  tax: number;
  makingChargePercent: number;
  deliveryDays?: number;
  isVerified: boolean;
}

/**
 * Hook to fetch seller comparison prices
 */
export function useSellerComparison(params: {
  buildMethod: string;
  metalType: string;
  weightGrams: number;
  gemstones?: NewGemstoneEntry[];
  finishType?: string;
  finishTier?: string;
  enabled?: boolean;
}) {
  const [sellers, setSellers] = useState<SellerPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const country = usePreferencesStore((state) => state.country);
  const currency = usePreferencesStore((state) => state.currency);

  const fetchSellers = useCallback(async () => {
    if (!params.enabled || !params.metalType || params.weightGrams <= 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/pricing/seller-comparison`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketCountry: country,
          displayCurrency: currency,
          buildMethod: params.buildMethod,
          primaryMetal: params.metalType,
          totalWeightG: params.weightGrams,
          finishType: params.finishType,
          finishTier: params.finishTier,
          gemstones: params.gemstones?.map(g => ({
            stoneType: g.stoneType,
            origin: g.origin,
            caratWeight: g.sizeUnit === 'CARAT' ? g.sizeValue : undefined,
            sizeMm: g.sizeUnit === 'MM' ? g.sizeValue : undefined,
            qualityGrade: g.clarity || 'STANDARD',
            settingType: g.settingStyle,
            count: g.count,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch seller prices');
      }

      const data = await response.json();
      setSellers(data.sellers || []);
    } catch (err) {
      console.error('Seller comparison error:', err);
      setError('Unable to load seller prices');
      // Return mock data for demo
      setSellers(generateMockSellers(country, params.weightGrams, params.metalType));
    } finally {
      setLoading(false);
    }
  }, [country, currency, params]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  return { sellers, loading, error, refresh: fetchSellers };
}

/**
 * Generate mock seller data for demonstration
 */
function generateMockSellers(
  country: string,
  weightGrams: number,
  metalType: string
): SellerPrice[] {
  const basePrice = getBasePrice(metalType) * weightGrams;
  const countryShops: Record<string, { name: string; city: string; rating: number; mcPct: number }[]> = {
    NP: [
      { name: 'Ramesh Gold House', city: 'Kathmandu', rating: 4.8, mcPct: 12 },
      { name: 'Suna Jewellers', city: 'Kathmandu', rating: 4.6, mcPct: 10 },
      { name: 'Fewa Gold House', city: 'Pokhara', rating: 4.5, mcPct: 11 },
    ],
    IN: [
      { name: 'Mumbai Gold & Diamonds', city: 'Mumbai', rating: 4.7, mcPct: 8 },
      { name: 'Mittal Jewellers Delhi', city: 'New Delhi', rating: 4.5, mcPct: 10 },
    ],
    AE: [
      { name: 'Dubai Gold Souk Jewels', city: 'Dubai', rating: 4.9, mcPct: 5 },
    ],
    UK: [
      { name: 'Hatton Garden Jewellers', city: 'London', rating: 4.6, mcPct: 15 },
    ],
    US: [
      { name: 'Diamond District NYC', city: 'New York', rating: 4.7, mcPct: 12 },
    ],
    EU: [
      { name: 'Berlin Schmuck Atelier', city: 'Berlin', rating: 4.5, mcPct: 18 },
    ],
  };

  const shops = countryShops[country] || countryShops['NP'];
  
  return shops.map((shop, index) => {
    const makingCharge = basePrice * (shop.mcPct / 100);
    const subtotal = basePrice + makingCharge;
    const taxRate = getTaxRate(country);
    const tax = subtotal * taxRate;
    
    return {
      shopId: `shop-${index + 1}`,
      shopName: shop.name,
      country,
      city: shop.city,
      rating: shop.rating,
      totalPrice: subtotal + tax,
      metalCost: basePrice,
      makingCharge,
      gemstoneCost: 0,
      finishCost: 0,
      tax,
      makingChargePercent: shop.mcPct,
      deliveryDays: 7 + Math.floor(Math.random() * 14),
      isVerified: true,
    };
  });
}

function getBasePrice(metalType: string): number {
  const prices: Record<string, number> = {
    GOLD_24K: 11500,
    GOLD_22K: 10800,
    GOLD_18K: 8900,
    GOLD_14K: 6800,
    SILVER_999: 130,
    SILVER_925: 120,
    PLATINUM_950: 4200,
    BRASS: 50,
    COPPER: 40,
  };
  return prices[metalType] || 5000;
}

function getTaxRate(country: string): number {
  const rates: Record<string, number> = {
    NP: 0.13,
    IN: 0.03,
    AE: 0.05,
    UK: 0.20,
    EU: 0.19,
    US: 0.08,
  };
  return rates[country] || 0.10;
}

// ═══════════════════════════════════════════
// REAL-TIME PRICE CALCULATION HOOK
// ═══════════════════════════════════════════

export interface RealTimePriceParams {
  buildMethod: string;
  metalType: string;
  weightGrams: number;
  finishType?: string;
  finishTier?: string;
  gemstones?: NewGemstoneEntry[];
  makingChargePercent?: number;
}

export function useRealTimePrice(params: RealTimePriceParams) {
  const [estimate, setEstimate] = useState<PriceEstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const country = usePreferencesStore((state) => state.country);
  const currency = usePreferencesStore((state) => state.currency);

  const fetchEstimate = useCallback(async () => {
    if (!params.metalType || params.weightGrams <= 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/pricing/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketCountry: country,
          displayCurrency: currency,
          buildMethod: params.buildMethod,
          primaryMetal: params.metalType,
          totalWeightG: params.weightGrams,
          makingChargePct: params.makingChargePercent || 12,
          finishType: params.finishType,
          finishTier: params.finishTier,
          gemstones: params.gemstones?.map(g => ({
            stoneType: g.stoneType,
            origin: g.origin,
            caratWeight: g.sizeUnit === 'CARAT' ? g.sizeValue : undefined,
            sizeMm: g.sizeUnit === 'MM' ? g.sizeValue : undefined,
            qualityGrade: g.clarity || 'STANDARD',
            settingType: g.settingStyle,
            count: g.count,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate price');
      }

      const data = await response.json();
      setEstimate({
        metalCost: data.subtotalUsd * (data.explanation?.fxRate?.rate || 1),
        makingCharge: data.makingCharge,
        platingCost: 0,
        gemstoneCost: data.lineItems?.find((l: any) => l.category === 'GEMSTONE')?.amountLocal || 0,
        finishCost: data.lineItems?.find((l: any) => l.category === 'FINISH')?.amountLocal || 0,
        subtotal: data.subtotal,
        tax: data.taxes,
        taxBreakdown: data.explanation?.taxCalculation?.breakdown,
        platformFee: data.platformFee,
        total: data.total,
        breakdown: {
          metalType: params.metalType,
          weightGrams: params.weightGrams,
          ratePerGram: data.subtotal / params.weightGrams,
          makingChargePercent: params.makingChargePercent || 12,
        },
        displayCurrency: currency,
        marketCountry: country,
        warnings: data.warnings,
      });
    } catch (err) {
      console.error('Price calculation error:', err);
      setError('Unable to calculate price');
      // Return local estimate
      setEstimate(calculateLocalEstimate(params, country, currency));
    } finally {
      setLoading(false);
    }
  }, [country, currency, params]);

  // Debounced fetch on parameter changes
  useEffect(() => {
    const timer = setTimeout(fetchEstimate, 500);
    return () => clearTimeout(timer);
  }, [fetchEstimate]);

  return { estimate, loading, error, refresh: fetchEstimate };
}

/**
 * Calculate local estimate when API is unavailable
 */
function calculateLocalEstimate(
  params: RealTimePriceParams,
  country: string,
  currency: string
): PriceEstimateResponse {
  const basePrice = getBasePrice(params.metalType) * params.weightGrams;
  const makingChargePercent = params.makingChargePercent || 12;
  const makingCharge = basePrice * (makingChargePercent / 100);
  
  // Estimate gemstone costs
  let gemstoneCost = 0;
  if (params.gemstones) {
    gemstoneCost = params.gemstones.reduce((sum, gem) => {
      const pricePerUnit = getGemstonePrice(gem.stoneType, gem.origin || 'NATURAL');
      const sizeVal = typeof gem.sizeValue === 'string' ? parseFloat(gem.sizeValue) || 0 : gem.sizeValue;
      const quantity = gem.sizeUnit === 'CARAT' ? sizeVal : sizeVal / 5; // rough conversion
      return sum + (pricePerUnit * quantity * gem.count);
    }, 0);
  }

  // Estimate finish cost
  let finishCost = 0;
  if (params.finishType) {
    finishCost = getFinishPrice(params.finishType, params.finishTier, params.weightGrams);
  }

  const subtotal = basePrice + makingCharge + gemstoneCost + finishCost;
  const taxRate = getTaxRate(country);
  const tax = subtotal * taxRate;
  const platformFee = subtotal * 0.01;
  const total = subtotal + tax + platformFee;

  return {
    metalCost: basePrice,
    makingCharge,
    platingCost: 0,
    gemstoneCost,
    finishCost,
    subtotal,
    tax,
    taxBreakdown: [{ name: country === 'IN' ? 'GST' : 'VAT', rate: taxRate, amount: tax }],
    platformFee,
    total,
    breakdown: {
      metalType: params.metalType,
      weightGrams: params.weightGrams,
      ratePerGram: basePrice / params.weightGrams,
      makingChargePercent,
    },
    displayCurrency: currency,
    marketCountry: country,
  };
}

function getGemstonePrice(stoneType: string, origin: 'NATURAL' | 'LAB'): number {
  const prices: Record<string, Record<string, number>> = {
    DIAMOND: { NATURAL: 150000, LAB: 30000 },
    DIAMOND_NATURAL: { NATURAL: 150000, LAB: 150000 },
    DIAMOND_LAB: { NATURAL: 30000, LAB: 30000 },
    MOISSANITE: { NATURAL: 10000, LAB: 10000 },
    RUBY: { NATURAL: 25000, LAB: 5000 },
    SAPPHIRE: { NATURAL: 20000, LAB: 4000 },
    EMERALD: { NATURAL: 35000, LAB: 7000 },
    PEARL: { NATURAL: 2000, LAB: 500 },
    CUBIC_ZIRCONIA: { NATURAL: 100, LAB: 100 },
    AMETHYST: { NATURAL: 1000, LAB: 500 },
    TOPAZ: { NATURAL: 1500, LAB: 700 },
    GARNET: { NATURAL: 2000, LAB: 1000 },
  };
  return prices[stoneType.toUpperCase()]?.[origin] || 5000;
}

function getFinishPrice(finishType: string, tier?: string, weightGrams?: number): number {
  const basePrices: Record<string, Record<string, number>> = {
    GOLD_PLATING: { LIGHT: 500, STANDARD: 1000, PREMIUM: 2000 },
    ROSE_GOLD_PLATING: { LIGHT: 500, STANDARD: 1000, PREMIUM: 2000 },
    VERMEIL: { STANDARD: 2500, PREMIUM: 4000 },
    RHODIUM_PLATING: { LIGHT: 600, STANDARD: 1500, PREMIUM: 2500 },
    PVD_COATING: { STANDARD: 1200, PREMIUM: 2000 },
    MATTE: { STANDARD: 300 },
    BRUSHED: { STANDARD: 400 },
    HAMMERED: { STANDARD: 500 },
    OXIDIZED: { STANDARD: 400 },
  };
  const base = basePrices[finishType.toUpperCase()]?.[tier?.toUpperCase() || 'STANDARD'] || 500;
  // Add per-gram cost for platings
  if (finishType.includes('PLATING') && weightGrams) {
    const perGramRate = tier === 'PREMIUM' ? 100 : tier === 'STANDARD' ? 50 : 25;
    return base + (perGramRate * weightGrams);
  }
  return base;
}

// ═══════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════

export {
  getBasePrice,
  getTaxRate,
  getGemstonePrice,
  getFinishPrice,
};
