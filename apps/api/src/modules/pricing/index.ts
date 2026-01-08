/**
 * Pricing Module Exports
 * 
 * Re-exports all pricing-related services, DTOs, and types.
 */

// Services
export { CommodityRatesService, PURITY_MULTIPLIERS } from './services/commodity-rates.service';
export { TaxRulesService, DEFAULT_TAX_RATES, US_STATE_TAX_RATES } from './services/tax-rules.service';
export { PricingEngineService } from './services/pricing-engine.service';
export { 
  BackendTaxEngineService,
  type TaxRegime,
  type TaxableComponent,
  type TaxLineItem,
  type ComponentBreakdown,
  type TaxCalculationRequest,
  type TaxCalculationResult,
} from './services/backend-tax-engine.service';

// DTOs
export * from './dto/pricing-request.dto';
export * from './dto/pricing-response.dto';

// Types
export type {
  SupportedCountry,
  PricingRequest,
  GemstoneInput,
  PricingLineItem,
  PricingWarning,
  SpotPriceInfo,
  MarketAdjustment,
  ShopOverride,
  PricingExplanation,
  PricingResponse,
} from './services/pricing-engine.service';

// Module
export { PricingModule } from './pricing.module';
