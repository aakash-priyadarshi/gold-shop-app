/**
 * Pricing Controller
 * REST API for pricing estimates and rate lookups
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { GetRatesQueryDto, PricingEstimateDto } from "./dto";
import { FinishPricingService } from "./services/finish-pricing.service";
import { GemstonesPricingService } from "./services/gemstones-pricing.service";
import { MaterialPricingService } from "./services/material-pricing.service";
import { PricingEstimateService } from "./services/pricing-estimate.service";
import { PricingFxService } from "./services/pricing-fx.service";
import {
  EstimateResponse,
  FinishPrice,
  FxRates,
  MaterialRate,
  SupportedCountry,
} from "./types";

@Controller("pricing")
export class PricingController {
  constructor(
    private readonly estimateService: PricingEstimateService,
    private readonly fxService: PricingFxService,
    private readonly materialService: MaterialPricingService,
    private readonly finishService: FinishPricingService,
    private readonly gemstoneService: GemstonesPricingService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /pricing/estimate
   * Calculate complete pricing estimate for a jewellery item
   */
  @Post("estimate")
  @HttpCode(HttpStatus.OK)
  async calculateEstimate(
    @Body() dto: PricingEstimateDto,
  ): Promise<EstimateResponse> {
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
  @Get("fx-rates")
  async getFxRates(): Promise<FxRates> {
    return this.fxService.getFxRates();
  }

  /**
   * GET /pricing/materials
   * Get all material rates for a country
   */
  @Get("materials")
  async getMaterialRates(
    @Query() query: GetRatesQueryDto,
  ): Promise<MaterialRate[]> {
    const country = (query.country || "NP") as SupportedCountry;
    return this.materialService.getAllMaterialRates(country);
  }

  /**
   * GET /pricing/finishes
   * Get all finish prices for a country
   */
  @Get("finishes")
  async getFinishPrices(
    @Query() query: GetRatesQueryDto,
  ): Promise<FinishPrice[]> {
    const country = (query.country || "NP") as SupportedCountry;
    return this.finishService.getAllFinishPrices(country);
  }

  /**
   * GET /pricing/gemstones/settings
   * Get all setting prices for a country
   */
  @Get("gemstones/settings")
  async getSettingPrices(@Query() query: GetRatesQueryDto) {
    const country = (query.country || "NP") as SupportedCountry;

    // Return all setting types with prices
    const settingTypes = [
      "PRONG",
      "BEZEL",
      "PAVE",
      "CHANNEL",
      "HALO",
      "FLUSH",
      "TENSION",
    ];
    const prices = await Promise.all(
      settingTypes.map((type) =>
        this.gemstoneService.getSettingPrice(type as any, country),
      ),
    );

    return prices;
  }

  /**
   * GET /pricing/quick-estimate
   * Get a quick min/max estimate without full breakdown
   */
  @Get("quick-estimate")
  async getQuickEstimate(
    @Query("buildMethod") buildMethod: string,
    @Query("totalWeightG") totalWeightG: string,
    @Query("metal") metal: string,
    @Query("country") country: string = "NP",
  ) {
    return this.estimateService.getQuickEstimate(
      buildMethod as any,
      parseFloat(totalWeightG) || 5,
      metal || "GOLD_22K",
      country as SupportedCountry,
    );
  }

  /**
   * GET /pricing/validate-fx
   * Validate current FX rates and return sanity check results
   */
  @Get("validate-fx")
  async validateFxRates() {
    const rates = await this.fxService.getFxRates();
    const validation = this.fxService.validateFxRates(rates);

    return {
      rates,
      validation,
      status: validation.isValid ? "OK" : "WARNING",
    };
  }

  // ════════════════════════════════════════════════════════
  // ADMIN — System Gemstone Pricing (GemstoneCatalog table)
  // ════════════════════════════════════════════════════════

  /**
   * GET /pricing/admin/gemstones
   * Fetch all system-level gemstone prices from GemstoneCatalog
   */
  @Get("admin/gemstones")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async getAdminGemstonePrices() {
    const catalog = await this.prisma.gemstoneCatalog.findMany({
      orderBy: [
        { stoneType: "asc" },
        { sizeMin: "asc" },
        { qualityTier: "asc" },
      ],
    });
    return { prices: catalog };
  }

  /**
   * PUT /pricing/admin/gemstones
   * Upsert system-level gemstone prices in GemstoneCatalog
   */
  @Put("admin/gemstones")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async updateAdminGemstonePrices(
    @Body()
    dto: {
      prices: Array<{
        id?: string;
        stoneType: string;
        origin?: string;
        sizeUnit: string;
        sizeMin: number;
        sizeMax: number;
        qualityTier: string;
        pricePerStone: number;
        currency: string;
        note?: string;
      }>;
    },
  ) {
    const results = await Promise.all(
      dto.prices.map(async (p) => {
        if (p.id) {
          // Update existing
          return this.prisma.gemstoneCatalog.update({
            where: { id: p.id },
            data: {
              stoneType: p.stoneType,
              origin: p.origin,
              sizeUnit: p.sizeUnit,
              sizeMin: p.sizeMin,
              sizeMax: p.sizeMax,
              qualityTier: p.qualityTier,
              pricePerStone: p.pricePerStone,
              currency: p.currency,
              source: "manual",
              note: p.note,
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new
          return this.prisma.gemstoneCatalog.create({
            data: {
              stoneType: p.stoneType,
              origin: p.origin,
              sizeUnit: p.sizeUnit,
              sizeMin: p.sizeMin,
              sizeMax: p.sizeMax,
              qualityTier: p.qualityTier,
              pricePerStone: p.pricePerStone,
              currency: p.currency,
              source: "manual",
              note: p.note,
            },
          });
        }
      }),
    );
    return { updated: results.length, prices: results };
  }
}
