/**
 * Pricing Module
 * 
 * Comprehensive pricing engine for Auram jewellery marketplace.
 * Handles:
 * - FX rates (multi-currency support)
 * - Material pricing (precious metals, base metals)
 * - Gemstone pricing (natural/lab, graded)
 * - Finish/plating pricing
 * - Tax calculations (region-specific)
 * - Shop overrides
 * - Full pricing estimates with explainable breakdowns
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';

// Legacy services (preserved for backward compatibility)
import { PricingFxService } from './services/pricing-fx.service';
import { MaterialPricingService } from './services/material-pricing.service';
import { GemstonesPricingService } from './services/gemstones-pricing.service';
import { FinishPricingService } from './services/finish-pricing.service';
import { PricingEstimateService } from './services/pricing-estimate.service';

// New pricing engine services
import { CommodityRatesService } from './services/commodity-rates.service';
import { TaxRulesService } from './services/tax-rules.service';
import { PricingEngineService } from './services/pricing-engine.service';
import { BackendTaxEngineService } from './services/backend-tax-engine.service';

// Controllers
import { PricingController as LegacyPricingController } from './pricing.controller';
import { PricingController } from './controllers/pricing.controller';

// External modules
import { MarketRatesModule } from '../market-rates/market-rates.module';
import { FxRatesModule } from '../fx-rates';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    MarketRatesModule,
    FxRatesModule,
  ],
  controllers: [
    LegacyPricingController,
    PricingController,
  ],
  providers: [
    // Legacy services
    PricingFxService,
    MaterialPricingService,
    GemstonesPricingService,
    FinishPricingService,
    PricingEstimateService,
    
    // New pricing engine services
    CommodityRatesService,
    TaxRulesService,
    PricingEngineService,
    BackendTaxEngineService,
  ],
  exports: [
    // Legacy exports
    PricingFxService,
    MaterialPricingService,
    GemstonesPricingService,
    FinishPricingService,
    PricingEstimateService,
    
    // New exports
    CommodityRatesService,
    TaxRulesService,
    PricingEngineService,
    BackendTaxEngineService,
  ],
})
export class PricingModule {}
