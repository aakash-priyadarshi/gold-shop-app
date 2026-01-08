import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MaterialsService } from './materials.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('materials')
@Controller('materials')
export class MaterialsController {
  constructor(private materialsService: MaterialsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all reference data' })
  getAllReferenceData() {
    return {
      preciousMetals: this.materialsService.getPreciousMetals(),
      baseMetals: this.materialsService.getBaseMetals(),
      jewelleryAlloys: this.materialsService.getJewelleryAlloys(),
      surfaceFinishes: this.materialsService.getSurfaceFinishes(),
      platingTypes: this.materialsService.getPlatingTypes(),
      platingTiers: this.materialsService.getPlatingTiers(),
      gemstones: this.materialsService.getGemstones(),
      gemstoneShapes: this.materialsService.getGemstoneShapes(),
      settingStyles: this.materialsService.getSettingStyles(),
      jewelleryTypes: this.materialsService.getJewelleryTypes(),
      buildMethods: this.materialsService.getBuildMethods(),
    };
  }

  @Get('precious-metals')
  @ApiOperation({ summary: 'Get precious metals' })
  getPreciousMetals() {
    return this.materialsService.getPreciousMetals();
  }

  @Get('base-metals')
  @ApiOperation({ summary: 'Get base metals' })
  getBaseMetals() {
    return this.materialsService.getBaseMetals();
  }

  @Get('jewellery-alloys')
  @ApiOperation({ summary: 'Get jewellery alloys' })
  getJewelleryAlloys() {
    return this.materialsService.getJewelleryAlloys();
  }

  @Get('surface-finishes')
  @ApiOperation({ summary: 'Get surface finishes (non-coating)' })
  getSurfaceFinishes() {
    return this.materialsService.getSurfaceFinishes();
  }

  @Get('plating-types')
  @ApiOperation({ summary: 'Get coating/plating types' })
  getPlatingTypes() {
    return this.materialsService.getPlatingTypes();
  }

  @Get('finish-types')
  @ApiOperation({ summary: 'Get all finish types (surface finishes + platings)' })
  getFinishTypes() {
    return this.materialsService.getFinishTypes();
  }

  @Get('gemstones')
  @ApiOperation({ summary: 'Get gemstone types' })
  getGemstones() {
    return this.materialsService.getGemstones();
  }

  @Get('gemstone-shapes')
  @ApiOperation({ summary: 'Get gemstone shapes' })
  getGemstoneShapes() {
    return this.materialsService.getGemstoneShapes();
  }

  @Get('setting-styles')
  @ApiOperation({ summary: 'Get gemstone setting styles' })
  getSettingStyles() {
    return this.materialsService.getSettingStyles();
  }

  @Get('plating-tiers')
  @ApiOperation({ summary: 'Get plating tiers' })
  getPlatingTiers() {
    return this.materialsService.getPlatingTiers();
  }

  @Get('plating-options')
  @ApiOperation({ summary: 'Get plating options with pricing from database' })
  async getPlatingOptions() {
    return this.materialsService.getPlatingOptions();
  }

  @Get('jewellery-types')
  @ApiOperation({ summary: 'Get jewellery types' })
  getJewelleryTypes() {
    return this.materialsService.getJewelleryTypes();
  }

  @Get('build-methods')
  @ApiOperation({ summary: 'Get manufacturing build methods' })
  getBuildMethods() {
    return this.materialsService.getBuildMethods();
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get jewellery templates' })
  @ApiQuery({ name: 'jewelleryType', required: false })
  async getTemplates(@Query('jewelleryType') jewelleryType?: string) {
    return this.materialsService.getTemplates(jewelleryType);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get single template by ID' })
  async getTemplate(@Param('id') id: string) {
    return this.materialsService.getTemplate(id);
  }

  @Get('gemstone-presets')
  @ApiOperation({ summary: 'Get gemstone presets with pricing' })
  @ApiQuery({ name: 'templateId', required: false })
  @ApiQuery({ name: 'stoneType', required: false })
  async getGemstonePresets(
    @Query('templateId') templateId?: string,
    @Query('stoneType') stoneType?: string,
  ) {
    return this.materialsService.getGemstonePresets(templateId, stoneType);
  }

  @Get('market-rates')
  @ApiOperation({ summary: 'Get current market rates' })
  @ApiQuery({ name: 'country', required: false, description: 'Country code (NP, IN)' })
  async getMarketRates(@Query('country') country?: string) {
    return this.materialsService.getMarketRates(country);
  }

  @Post('estimate-price')
  @ApiOperation({ summary: 'Calculate price estimate for custom jewellery' })
  async estimatePrice(
    @Body() body: {
      metalType: string;
      weightGrams: number;
      buildMethod: string;
      country?: string;
      platingType?: string;
      platingTier?: string;
      gemstones?: Array<{ presetId?: string; count: number }>;
      makingChargePercent?: number;
    },
  ) {
    return this.materialsService.calculatePriceEstimate(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get material details' })
  getMaterialDetails(@Param('id') id: string) {
    return this.materialsService.getMaterialDetails(id);
  }

  @Post('market-rates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update market rate (admin only)' })
  async updateMarketRate(
    @Body() body: { materialType: string; ratePerGram: number; source: string },
  ) {
    return this.materialsService.updateMarketRate(
      body.materialType,
      body.ratePerGram,
      body.source,
    );
  }
}
