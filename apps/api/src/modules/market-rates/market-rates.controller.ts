import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MarketRatesService } from './market-rates.service';
import { GetMarketRatesDto } from './dto/get-market-rates.dto';
import { MarketRatesResponse, SupportedCountry, SupportedCurrency, MarketRegion } from './types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CURRENCY_TO_DEFAULT_REGION, COUNTRY_CURRENCIES, REGION_TO_DEFAULT_CURRENCY } from './country-adjustments';

@ApiTags('Market Rates')
@Controller('market-rates')
export class MarketRatesController {
  constructor(private readonly marketRatesService: MarketRatesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current market rates',
    description: `Returns live metal prices per gram in specified currency with tax/duty adjustments.
    
**New API (recommended):**
- Use \`currency\` parameter (NPR, INR, AED, USD, GBP, EUR)
- Optionally specify \`region\` to override default region

**Legacy API (deprecated):**
- Use \`country\` parameter (IN, NP) for backward compatibility`,
  })
  @ApiQuery({
    name: 'currency',
    enum: ['NPR', 'INR', 'AED', 'USD', 'GBP', 'EUR'],
    required: false,
    description: 'Currency code for pricing (default: NPR)',
  })
  @ApiQuery({
    name: 'region',
    enum: ['NP', 'IN', 'AE', 'UK', 'EU', 'US'],
    required: false,
    description: 'Market region for tax/duty adjustments (defaults based on currency)',
  })
  @ApiQuery({
    name: 'country',
    enum: ['IN', 'NP'],
    required: false,
    description: 'DEPRECATED - use currency and region instead',
    deprecated: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Market rates successfully retrieved',
    schema: {
      type: 'object',
      properties: {
        region: { type: 'string', enum: ['NP', 'IN', 'AE', 'UK', 'EU', 'US'] },
        currency: { type: 'string', enum: ['NPR', 'INR', 'AED', 'USD', 'GBP', 'EUR'] },
        country: { type: 'string', enum: ['IN', 'NP'], description: 'Legacy field for backward compat' },
        unit: { type: 'string', example: 'per_gram' },
        updatedAt: { type: 'string', format: 'date-time' },
        source: { type: 'string', enum: ['metalpriceapi', 'fallback', 'cached'] },
        cache: { type: 'string', enum: ['hit', 'miss', 'stale'] },
        warnings: { type: 'array', items: { type: 'string' } },
        fx: {
          type: 'object',
          properties: {
            pair: { type: 'string', example: 'USD_NPR' },
            rate: { type: 'number', example: 144.0 },
            source: { type: 'string', enum: ['frankfurter', 'exchangerate_host', 'fallback', 'derived'] },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        adjustments: {
          type: 'object',
          properties: {
            importDutyPct: { type: 'number', example: 15 },
            gstPct: { type: 'number', example: 3 },
            vatPct: { type: 'number', example: 13 },
            localPremiumPct: { type: 'number', example: 1.5 },
            multiplier: { type: 'number', example: 1.245 },
          },
        },
        metals: {
          type: 'object',
          properties: {
            GOLD_24K: { type: 'number', example: 12500.0 },
            GOLD_22K: { type: 'number', example: 11458.33 },
            GOLD_18K: { type: 'number', example: 9375.0 },
            GOLD_14K: { type: 'number', example: 7291.67 },
            GOLD_10K: { type: 'number', example: 5208.33 },
            SILVER_999: { type: 'number', example: 142.0 },
            SILVER_925: { type: 'number', example: 131.35 },
            PLATINUM_PT950: { type: 'number', example: 3600.0 },
            PLATINUM_PT900: { type: 'number', example: 3410.53 },
            PALLADIUM_PD950: { type: 'number', example: 3500.0 },
          },
        },
        debug: {
          type: 'object',
          description: 'Debug information for troubleshooting',
          properties: {
            spotSource: { type: 'string', enum: ['metalpriceapi', 'fallback'] },
            fxSource: { type: 'string', enum: ['frankfurter', 'exchangerate_host', 'fallback', 'db_cache'] },
            spotUsed: { type: 'object' },
            fxUsed: { type: 'object' },
            regionUsed: { type: 'string' },
            regionMultiplierUsed: { type: 'number' },
            computedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  async getMarketRates(@Query() query: GetMarketRatesDto): Promise<MarketRatesResponse> {
    // Handle country/region parameter (can be legacy IN/NP or modern AE/UK/EU/US)
    if (query.country) {
      // Map country to region (legacy 'IN'/'NP' are also regions)
      const region = query.country as MarketRegion;
      
      // If no currency provided, use the default for this region
      if (!query.currency) {
        const regionDefaultCurrency = REGION_TO_DEFAULT_CURRENCY[region];
        return this.marketRatesService.getMarketRates(regionDefaultCurrency, region);
      }
      
      // If currency is provided with country, use both
      const currency = query.currency as SupportedCurrency;
      return this.marketRatesService.getMarketRates(currency, region);
    }

    // New API: currency-first approach (no country specified)
    const currency = (query.currency || 'NPR') as SupportedCurrency;
    const region = query.region as MarketRegion | undefined;
    return this.marketRatesService.getMarketRates(currency, region);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Force refresh market rates',
    description: 'Admin-only endpoint to force refresh cached market rates',
  })
  @ApiQuery({
    name: 'currency',
    enum: ['NPR', 'INR', 'AED', 'USD', 'GBP', 'EUR'],
    required: false,
    description: 'Currency to refresh (default: NPR)',
  })
  @ApiQuery({
    name: 'region',
    enum: ['NP', 'IN', 'AE', 'UK', 'EU', 'US'],
    required: false,
    description: 'Region to refresh (defaults based on currency)',
  })
  @ApiResponse({
    status: 200,
    description: 'Market rates refreshed successfully',
  })
  async refreshMarketRates(@Query() query: GetMarketRatesDto): Promise<MarketRatesResponse> {
    const currency = (query.currency || 'NPR') as SupportedCurrency;
    const region = query.region as MarketRegion | undefined;
    return this.marketRatesService.forceRefresh(currency, region);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get market rates API status',
    description: 'Check if the MetalpriceAPI is configured and get fallback values',
  })
  @ApiResponse({
    status: 200,
    description: 'API status and configuration',
    schema: {
      type: 'object',
      properties: {
        apiConfigured: { type: 'boolean' },
        cacheTtlHours: { type: 'number' },
        fallbackSpotPrices: {
          type: 'object',
          properties: {
            XAU: { type: 'number', example: 2650.0 },
            XAG: { type: 'number', example: 30.0 },
            XPT: { type: 'number', example: 980.0 },
            XPD: { type: 'number', example: 950.0 },
          },
        },
      },
    },
  })
  getStatus() {
    return this.marketRatesService.getStatus();
  }

  @Get('validate')
  @ApiOperation({
    summary: 'Validate cross-currency pricing',
    description: 'Checks that NPR/INR price ratio is within expected range (~1.6)',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result with actual vs expected ratios',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        inrGold24K: { type: 'number' },
        nprGold24K: { type: 'number' },
        actualRatio: { type: 'number' },
        expectedRatioMin: { type: 'number' },
        expectedRatioMax: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  async validatePrices() {
    return this.marketRatesService.validateCrossCurrencyPrices();
  }

  @Get('compare')
  @ApiOperation({
    summary: 'Get comparative rates for multiple regions',
    description: 'Returns market rates for India, Nepal, UAE, and USA with validation status',
  })
  @ApiResponse({
    status: 200,
    description: 'Comparative rates for multiple regions',
  })
  async getComparativeRates() {
    return this.marketRatesService.getComparativeRates();
  }
}
