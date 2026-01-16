/**
 * Pricing FX Service
 * Handles FX rate fetching, validation, and sanity checks
 *
 * REFACTORED: Now uses FxRatesService (free Frankfurter API) instead of
 * calling paid MetalpriceAPI. MetalpriceAPI is now ONLY used for metal
 * spot prices in market-rates.service.ts
 */
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FxRatesService } from "../../fx-rates/fx-rates.service";
import {
  FxRates,
  FxSanityCheck,
  SupportedCountry,
  SupportedCurrency,
} from "../types";

// Expected INR to NPR ratio range (historical: ~1.55-1.65)
const INR_NPR_RATIO_MIN = 1.45;
const INR_NPR_RATIO_MAX = 1.8;

// Default FX rates (fallback when API unavailable)
// CRITICAL: These must be accurate to prevent pricing bugs
const DEFAULT_FX_RATES: FxRates = {
  usdToINR: 83.5, // As of Jan 2026
  usdToNPR: 133.5, // NPR is pegged to INR at ~1.6
  inrToNPR: 1.6, // INR to NPR exchange rate
  source: "fallback",
  updatedAt: new Date().toISOString(),
};

@Injectable()
export class PricingFxService {
  private readonly logger = new Logger(PricingFxService.name);

  // Cache FX rates for 1 hour (to match FxRatesService caching)
  private fxCache: { data: FxRates; expiresAt: Date } | null = null;
  private readonly cacheTtlMs = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly configService: ConfigService,
    private readonly fxRatesService: FxRatesService
  ) {}

  /**
   * Get all FX rates needed for pricing
   * Now uses FxRatesService (free Frankfurter API) instead of MetalpriceAPI
   */
  async getFxRates(): Promise<FxRates> {
    // Check cache first
    if (this.fxCache && this.fxCache.expiresAt > new Date()) {
      return this.fxCache.data;
    }

    try {
      // Use the free FxRatesService instead of MetalpriceAPI
      const fxSnapshot = await this.fxRatesService.getFxSnapshot();

      const rates: FxRates = {
        usdToINR: fxSnapshot.USD_INR.rate,
        usdToNPR: fxSnapshot.USD_NPR.rate,
        inrToNPR: fxSnapshot.USD_NPR.rate / fxSnapshot.USD_INR.rate,
        source: fxSnapshot.USD_INR.source === "fallback" ? "fallback" : "api",
        updatedAt: fxSnapshot.USD_INR.updatedAt,
      };

      // Validate the rates before using
      const sanityCheck = this.validateFxRates(rates);
      if (!sanityCheck.isValid) {
        this.logger.error(`FX sanity check failed: ${sanityCheck.message}`);
        this.logger.warn("Falling back to default FX rates");
        return this.getDefaultFxRates();
      }

      // Cache the valid rates
      this.fxCache = {
        data: rates,
        expiresAt: new Date(Date.now() + this.cacheTtlMs),
      };

      return rates;
    } catch (error) {
      this.logger.error(`Failed to fetch FX rates: ${error}`);
      return this.getDefaultFxRates();
    }
  }

  /**
   * Get default FX rates (fallback)
   */
  private getDefaultFxRates(): FxRates {
    const defaultINR = parseFloat(
      this.configService.get<string>("DEFAULT_USD_INR") || "83.50"
    );
    const defaultNPR = parseFloat(
      this.configService.get<string>("DEFAULT_USD_NPR") || "133.50"
    );

    return {
      ...DEFAULT_FX_RATES,
      usdToINR: defaultINR,
      usdToNPR: defaultNPR,
      inrToNPR: defaultNPR / defaultINR,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Validate FX rates with sanity checks
   * CRITICAL: This catches the Nepal FX bug
   */
  validateFxRates(rates: FxRates): FxSanityCheck {
    const ratio = rates.inrToNPR;

    // INR to NPR should be within expected range (~1.45 to 1.80)
    if (ratio < INR_NPR_RATIO_MIN || ratio > INR_NPR_RATIO_MAX) {
      return {
        isValid: false,
        expectedRatio: { min: INR_NPR_RATIO_MIN, max: INR_NPR_RATIO_MAX },
        actualRatio: ratio,
        message: `INR/NPR ratio ${ratio.toFixed(
          3
        )} is outside expected range [${INR_NPR_RATIO_MIN}, ${INR_NPR_RATIO_MAX}]`,
      };
    }

    // USD to NPR should always be greater than USD to INR
    if (rates.usdToNPR <= rates.usdToINR) {
      return {
        isValid: false,
        expectedRatio: { min: INR_NPR_RATIO_MIN, max: INR_NPR_RATIO_MAX },
        actualRatio: ratio,
        message: `USD/NPR (${rates.usdToNPR}) should be greater than USD/INR (${rates.usdToINR})`,
      };
    }

    return {
      isValid: true,
      expectedRatio: { min: INR_NPR_RATIO_MIN, max: INR_NPR_RATIO_MAX },
      actualRatio: ratio,
    };
  }

  /**
   * Get FX rate for a specific country
   */
  async getFxRateForCountry(
    country: SupportedCountry
  ): Promise<{ rate: number; currency: SupportedCurrency }> {
    const rates = await this.getFxRates();

    if (country === "IN") {
      return { rate: rates.usdToINR, currency: "INR" };
    } else {
      return { rate: rates.usdToNPR, currency: "NPR" };
    }
  }

  /**
   * Convert USD amount to local currency
   */
  async convertUsdToLocal(
    usdAmount: number,
    country: SupportedCountry
  ): Promise<number> {
    const { rate } = await this.getFxRateForCountry(country);
    return usdAmount * rate;
  }

  /**
   * Convert INR to NPR (used for cross-country comparison)
   */
  async convertInrToNpr(inrAmount: number): Promise<number> {
    const rates = await this.getFxRates();
    return inrAmount * rates.inrToNPR;
  }

  /**
   * Validate price sanity between INR and NPR
   * CRITICAL: Use this to catch Nepal pricing bugs
   */
  async validateCrossCurrencyPrices(
    priceINR: number,
    priceNPR: number
  ): Promise<FxSanityCheck> {
    const rates = await this.getFxRates();
    const expectedNPR = priceINR * rates.inrToNPR;
    const actualRatio = priceNPR / priceINR;

    // Allow 5% tolerance for rounding and timing differences
    const tolerance = 0.05;
    const minExpected = expectedNPR * (1 - tolerance);
    const maxExpected = expectedNPR * (1 + tolerance);

    if (priceNPR < minExpected || priceNPR > maxExpected) {
      return {
        isValid: false,
        expectedRatio: {
          min: rates.inrToNPR * (1 - tolerance),
          max: rates.inrToNPR * (1 + tolerance),
        },
        actualRatio,
        message: `NPR price (${priceNPR.toFixed(
          2
        )}) should be ~${expectedNPR.toFixed(2)} (INR×${rates.inrToNPR.toFixed(
          2
        )})`,
      };
    }

    return {
      isValid: true,
      expectedRatio: {
        min: rates.inrToNPR * (1 - tolerance),
        max: rates.inrToNPR * (1 + tolerance),
      },
      actualRatio,
    };
  }
}
