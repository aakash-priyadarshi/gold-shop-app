/**
 * Pricing Controller
 * REST API for pricing estimates and rate lookups
 */
import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { PricingEstimateService } from './services/pricing-estimate.service';
import { PricingFxService } from './services/pricing-fx.service';
import { MaterialPricingService } from './services/material-pricing.service';
import { FinishPricingService } from './services/finish-pricing.service';
import { GemstonesPricingService } from './services/gemstones-pricing.service';
import { PricingEstimateDto, GetRatesQueryDto } from './dto';
import {
  EstimateResponse,
  FxRates,
  MaterialRate,
  FinishPrice,
  SupportedCountry,
} from './types';

@Controller('pricing')
export class PricingController {
  constructor(
    private readonly estimateService: PricingEstimateService,
    private readonly fxService: PricingFxService,
    private readonly materialService: MaterialPricingService,
    private readonly finishService: FinishPricingService,
    private readonly gemstoneService: GemstonesPricingService,
  ) {}

  /**
   * POST /pricing/estimate
   * Calculate complete pricing estimate for a jewellery item
   */
  @Post('estimate')
  @HttpCode(HttpStatus.OK)
  async calculateEstimate(@Body() dto: PricingEstimateDto): Promise<EstimateResponse> {
    return this.estimateService.calculateEstimate({
      country: dto.country,
      currency: dto.currency,
      jewelleryType: dto.jewelleryType,
      buildMethod: dto.buildMethod,
      totalWeightG: dto.totalWeightG,
      methodA: dto.methodA,
      methodB: dto.methodB,
      methodC: dto.methodC,
      methodD: dto.methodD,
      finish: dto.finish,
      gemstones: dto.gemstones,
      makingChargePct: dto.makingChargePct,
      shopId: dto.shopId,
    });
  }

  /**
   * GET /pricing/fx-rates
   * Get current FX rates with sanity validation
   */
  @Get('fx-rates')
  async getFxRates(): Promise<FxRates> {
    return this.fxService.getFxRates();
  }

  /**
   * GET /pricing/materials
   * Get all material rates for a country
   */
  @Get('materials')
  async getMaterialRates(
    @Query() query: GetRatesQueryDto,
  ): Promise<MaterialRate[]> {
    const country = (query.country || 'NP') as SupportedCountry;
    return this.materialService.getAllMaterialRates(country);
  }

  /**
   * GET /pricing/finishes
   * Get all finish prices for a country
   */
  @Get('finishes')
  async getFinishPrices(
    @Query() query: GetRatesQueryDto,
  ): Promise<FinishPrice[]> {
    const country = (query.country || 'NP') as SupportedCountry;
    return this.finishService.getAllFinishPrices(country);
  }

  /**
   * GET /pricing/gemstones/settings
   * Get all setting prices for a country
   */
  @Get('gemstones/settings')
  async getSettingPrices(@Query() query: GetRatesQueryDto) {
    const country = (query.country || 'NP') as SupportedCountry;
    
    // Return all setting types with prices
    const settingTypes = ['PRONG', 'BEZEL', 'PAVE', 'CHANNEL', 'HALO', 'FLUSH', 'TENSION'];
    const prices = await Promise.all(
      settingTypes.map(type => 
        this.gemstoneService.getSettingPrice(type as any, country)
      )
    );
    
    return prices;
  }

  /**
   * GET /pricing/quick-estimate
   * Get a quick min/max estimate without full breakdown
   */
  @Get('quick-estimate')
  async getQuickEstimate(
    @Query('buildMethod') buildMethod: string,
    @Query('totalWeightG') totalWeightG: string,
    @Query('metal') metal: string,
    @Query('country') country: string = 'NP',
  ) {
    return this.estimateService.getQuickEstimate(
      buildMethod as any,
      parseFloat(totalWeightG) || 5,
      metal || 'GOLD_22K',
      country as SupportedCountry,
    );
  }

  /**
   * GET /pricing/validate-fx
   * Validate current FX rates and return sanity check results
   */
  @Get('validate-fx')
  async validateFxRates() {
    const rates = await this.fxService.getFxRates();
    const validation = this.fxService.validateFxRates(rates);
    
    return {
      rates,
      validation,
      status: validation.isValid ? 'OK' : 'WARNING',
    };
  }
}
