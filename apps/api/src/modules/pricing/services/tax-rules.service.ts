/**
 * Tax Rules Service
 *
 * Handles tax calculation based on:
 * - Market region (NP, IN, AE, UK, EU, US)
 * - Category (precious metal, making charge, gemstone, finish)
 * - Configurable rules from DB
 *
 * Tax types supported:
 * - GST (India) - 3% on making charges for gold jewellery
 * - VAT (Nepal, UAE, UK, EU) - varies by region
 * - Sales Tax (US) - state-specific, configurable
 *
 * Features:
 * - Config-driven tax rules
 * - Category-specific rates
 * - Compounding tax support
 * - Tax breakdown for transparency
 */

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { MarketRegion } from "../../market-rates/types";

// Default tax rates by region (fallback if DB not configured)
export const DEFAULT_TAX_RATES: Record<
  MarketRegion,
  {
    taxType: string;
    taxName: string;
    rates: Record<string, number>;
    defaultRate: number;
  }
> = {
  IN: {
    taxType: "GST",
    taxName: "GST",
    rates: {
      PRECIOUS_METAL: 0.03, // 3% GST on gold/silver
      MAKING_CHARGE: 0.18, // 18% GST on making charges (service)
      GEMSTONE: 0.03, // 3% GST
      FINISH: 0.18, // 18% GST (service)
      ALL: 0.03, // Default fallback
    },
    defaultRate: 0.03,
  },
  NP: {
    taxType: "LUXURY_TAX",
    taxName: "Luxury Tax / VAT",
    rates: {
      PRECIOUS_METAL: 0.02, // 2% Luxury Tax on gold/silver
      MAKING_CHARGE: 0.02, // 2% Luxury Tax on making charges
      GEMSTONE: 0.13, // 13% VAT on gemstones/diamonds
      FINISH: 0.02, // 2% Luxury Tax
      ALL: 0.02, // Default fallback
    },
    defaultRate: 0.02,
  },
  AE: {
    taxType: "VAT",
    taxName: "VAT",
    rates: {
      PRECIOUS_METAL: 0.05, // 5% VAT (UAE)
      MAKING_CHARGE: 0.05,
      GEMSTONE: 0.05,
      FINISH: 0.05,
      ALL: 0.05,
    },
    defaultRate: 0.05,
  },
  UK: {
    taxType: "VAT",
    taxName: "VAT",
    rates: {
      PRECIOUS_METAL: 0.2, // 20% VAT (UK)
      MAKING_CHARGE: 0.2,
      GEMSTONE: 0.2,
      FINISH: 0.2,
      ALL: 0.2,
    },
    defaultRate: 0.2,
  },
  EU: {
    taxType: "VAT",
    taxName: "VAT",
    rates: {
      PRECIOUS_METAL: 0.19, // ~19% average VAT (EU varies)
      MAKING_CHARGE: 0.19,
      GEMSTONE: 0.19,
      FINISH: 0.19,
      ALL: 0.19,
    },
    defaultRate: 0.19,
  },
  US: {
    taxType: "SALES_TAX",
    taxName: "Sales Tax",
    rates: {
      PRECIOUS_METAL: 0.0, // No federal sales tax
      MAKING_CHARGE: 0.0,
      GEMSTONE: 0.0,
      FINISH: 0.0,
      ALL: 0.0,
    },
    defaultRate: 0.0,
  },
};

// US state sales tax rates (example - should be in DB)
export const US_STATE_TAX_RATES: Record<string, number> = {
  CA: 0.0725, // California
  NY: 0.08, // New York
  TX: 0.0625, // Texas
  FL: 0.06, // Florida
  WA: 0.065, // Washington
  IL: 0.0625, // Illinois
  PA: 0.06, // Pennsylvania
  OH: 0.0575, // Ohio
  GA: 0.04, // Georgia
  NC: 0.0475, // North Carolina
  NJ: 0.06625, // New Jersey
  VA: 0.053, // Virginia
  AZ: 0.056, // Arizona
  MA: 0.0625, // Massachusetts
  CO: 0.029, // Colorado
  OR: 0.0, // Oregon (no sales tax)
  MT: 0.0, // Montana (no sales tax)
  NH: 0.0, // New Hampshire (no sales tax)
  DE: 0.0, // Delaware (no sales tax)
  AK: 0.0, // Alaska (no state sales tax)
};

// Tax line item for breakdown
export interface TaxLineItem {
  taxType: string;
  taxName: string;
  category: string;
  taxableAmount: number;
  rate: number;
  taxAmount: number;
  description: string;
}

// Tax calculation result
export interface TaxCalculationResult {
  region: MarketRegion;
  stateCode?: string;
  totalTaxableAmount: number;
  totalTaxAmount: number;
  effectiveRate: number;
  breakdown: TaxLineItem[];
  source: "DB" | "DEFAULT";
  notes?: string;
}

// Tax rule from DB
interface TaxRule {
  id: string;
  marketRegion: MarketRegion;
  taxType: string;
  taxName: string;
  category: string;
  rate: number;
  isCompounding: boolean;
  priority: number;
  stateCode: string | null;
  description: string | null;
  isActive: boolean;
}

@Injectable()
export class TaxRulesService {
  private readonly logger = new Logger(TaxRulesService.name);

  // Cache for tax rules
  private rulesCache: Map<string, TaxRule[]> = new Map();
  private cacheExpiresAt: Date | null = null;
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate taxes for a given breakdown of amounts by category
   */
  async calculateTaxes(
    region: MarketRegion,
    categoryAmounts: Record<string, number>,
    stateCode?: string,
  ): Promise<TaxCalculationResult> {
    const rules = await this.getTaxRules(region, stateCode);
    const breakdown: TaxLineItem[] = [];
    let totalTaxAmount = 0;
    let totalTaxableAmount = 0;

    // Sort rules by priority for compounding
    const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

    // Track running totals for compounding
    let runningTotal = Object.values(categoryAmounts).reduce(
      (sum, amt) => sum + amt,
      0,
    );

    for (const [category, amount] of Object.entries(categoryAmounts)) {
      if (amount <= 0) continue;

      // Find applicable rule for this category
      const rule = sortedRules.find(
        (r) => r.category === category || r.category === "ALL",
      );

      if (!rule) continue;

      // Calculate tax
      let taxableAmount = amount;

      // If compounding, use running total
      if (rule.isCompounding) {
        taxableAmount = runningTotal;
      }

      const taxAmount = taxableAmount * rule.rate;
      totalTaxAmount += taxAmount;
      totalTaxableAmount += taxableAmount;

      // Update running total for next compounding rule
      if (rule.isCompounding) {
        runningTotal += taxAmount;
      }

      breakdown.push({
        taxType: rule.taxType,
        taxName: rule.taxName,
        category,
        taxableAmount,
        rate: rule.rate,
        taxAmount,
        description:
          rule.description ||
          `${rule.taxName} @ ${(rule.rate * 100).toFixed(2)}%`,
      });
    }

    const effectiveRate =
      totalTaxableAmount > 0 ? totalTaxAmount / totalTaxableAmount : 0;

    return {
      region,
      stateCode,
      totalTaxableAmount,
      totalTaxAmount,
      effectiveRate,
      breakdown,
      source: rules.length > 0 && rules[0].id ? "DB" : "DEFAULT",
      notes:
        stateCode && region === "US"
          ? `State sales tax for ${stateCode}`
          : undefined,
    };
  }

  /**
   * Get tax rate for a specific category in a region
   */
  async getTaxRate(
    region: MarketRegion,
    category: string,
    stateCode?: string,
  ): Promise<number> {
    const rules = await this.getTaxRules(region, stateCode);

    // Find rule for category or ALL
    const rule = rules.find(
      (r) => r.category === category || r.category === "ALL",
    );

    if (rule) {
      return rule.rate;
    }

    // Use defaults
    const defaults = DEFAULT_TAX_RATES[region];
    return defaults.rates[category] ?? defaults.defaultRate;
  }

  /**
   * Get tax display name for a region
   */
  async getTaxDisplayName(region: MarketRegion): Promise<string> {
    const rules = await this.getTaxRules(region);

    if (rules.length > 0) {
      const rate = rules[0].rate * 100;
      return `${rules[0].taxName} (${rate.toFixed(0)}%)`;
    }

    const defaults = DEFAULT_TAX_RATES[region];
    const rate = defaults.defaultRate * 100;
    return `${defaults.taxName} (${rate.toFixed(0)}%)`;
  }

  /**
   * Get all tax rules for a region
   */
  private async getTaxRules(
    region: MarketRegion,
    stateCode?: string,
  ): Promise<TaxRule[]> {
    const cacheKey = `${region}:${stateCode || "default"}`;

    // Check cache
    if (this.cacheExpiresAt && this.cacheExpiresAt > new Date()) {
      const cached = this.rulesCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Fetch from DB
    let rules: TaxRule[] = [];

    try {
      const dbRules =
        (await (this.prisma as any).taxRuleConfig?.findMany({
          where: {
            marketRegion: region,
            isActive: true,
            OR: [{ stateCode: null }, { stateCode: stateCode || null }],
          },
          orderBy: { priority: "asc" },
        })) || [];

      if (dbRules.length > 0) {
        rules = dbRules.map((r: any) => ({
          id: r.id,
          marketRegion: r.marketRegion as MarketRegion,
          taxType: r.taxType,
          taxName: r.taxName,
          category: r.category,
          rate: r.rate,
          isCompounding: r.isCompounding,
          priority: r.priority,
          stateCode: r.stateCode,
          description: r.description,
          isActive: r.isActive,
        }));
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch tax rules from DB: ${error}`);
    }

    // Fall back to defaults if no DB rules
    if (rules.length === 0) {
      rules = this.getDefaultRules(region, stateCode);
    }

    // Update cache
    this.rulesCache.set(cacheKey, rules);
    this.cacheExpiresAt = new Date(Date.now() + this.cacheTtlMs);

    return rules;
  }

  /**
   * Get default tax rules for a region
   */
  private getDefaultRules(region: MarketRegion, stateCode?: string): TaxRule[] {
    const defaults = DEFAULT_TAX_RATES[region];
    const rules: TaxRule[] = [];

    // For US, use state-specific rate if available
    if (region === "US" && stateCode) {
      const stateRate = US_STATE_TAX_RATES[stateCode] ?? 0;

      rules.push({
        id: "",
        marketRegion: region,
        taxType: "SALES_TAX",
        taxName: "Sales Tax",
        category: "ALL",
        rate: stateRate,
        isCompounding: false,
        priority: 0,
        stateCode,
        description: `${stateCode} State Sales Tax`,
        isActive: true,
      });

      return rules;
    }

    // Generate rules for each category
    for (const [category, rate] of Object.entries(defaults.rates)) {
      rules.push({
        id: "",
        marketRegion: region,
        taxType: defaults.taxType,
        taxName: defaults.taxName,
        category,
        rate,
        isCompounding: false,
        priority: 0,
        stateCode: null,
        description: null,
        isActive: true,
      });
    }

    return rules;
  }

  /**
   * Clear the tax rules cache
   */
  clearCache(): void {
    this.rulesCache.clear();
    this.cacheExpiresAt = null;
    this.logger.debug("Tax rules cache cleared");
  }

  /**
   * Get tax summary for a region (for display)
   */
  async getTaxSummary(region: MarketRegion): Promise<{
    taxType: string;
    taxName: string;
    defaultRate: number;
    categoryRates: Record<string, number>;
    notes?: string;
  }> {
    const rules = await this.getTaxRules(region);

    if (rules.length > 0) {
      const categoryRates: Record<string, number> = {};
      for (const rule of rules) {
        categoryRates[rule.category] = rule.rate;
      }

      return {
        taxType: rules[0].taxType,
        taxName: rules[0].taxName,
        defaultRate:
          rules.find((r) => r.category === "ALL")?.rate ?? rules[0].rate,
        categoryRates,
      };
    }

    const defaults = DEFAULT_TAX_RATES[region];
    return {
      taxType: defaults.taxType,
      taxName: defaults.taxName,
      defaultRate: defaults.defaultRate,
      categoryRates: defaults.rates,
      notes: region === "US" ? "Tax varies by state" : undefined,
    };
  }

  /**
   * Validate tax configuration for a region
   */
  async validateTaxConfig(region: MarketRegion): Promise<{
    isValid: boolean;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    const rules = await this.getTaxRules(region);

    // Check for missing categories
    const requiredCategories = [
      "PRECIOUS_METAL",
      "MAKING_CHARGE",
      "GEMSTONE",
      "FINISH",
    ];
    const configuredCategories = new Set(rules.map((r) => r.category));

    for (const cat of requiredCategories) {
      if (!configuredCategories.has(cat) && !configuredCategories.has("ALL")) {
        warnings.push(`Missing tax rule for category: ${cat}`);
      }
    }

    // Check for rate sanity
    for (const rule of rules) {
      if (rule.rate < 0) {
        errors.push(`Negative tax rate for ${rule.category}: ${rule.rate}`);
      }
      if (rule.rate > 0.5) {
        warnings.push(
          `High tax rate for ${rule.category}: ${(rule.rate * 100).toFixed(1)}%`,
        );
      }
    }

    // US-specific checks
    if (region === "US" && rules.length === 0) {
      warnings.push("No state-specific tax rules configured for US");
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }
}
