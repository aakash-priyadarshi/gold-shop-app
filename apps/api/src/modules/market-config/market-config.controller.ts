import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { MarketConfigService } from './market-config.service';
import { UpdateMarketConfigDto } from './dto/update-market-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('market')
export class MarketConfigController {
  constructor(private readonly marketConfigService: MarketConfigService) {}

  /**
   * Get market config by country code
   * GET /api/market/config?country=NP
   */
  @Get('config')
  async getConfig(@Query('country') country?: string) {
    const countryCode = country || 'US';
    return this.marketConfigService.getConfig(countryCode);
  }

  /**
   * Get market config based on detected country from headers
   * GET /api/market/my-config
   */
  @Get('my-config')
  async getMyConfig(
    @Headers() headers: Record<string, string>,
    @Query('country') countryOverride?: string,
  ) {
    // Allow override via query param (useful for testing)
    let countryCode = countryOverride;
    
    if (!countryCode) {
      // Detect from headers
      countryCode = this.marketConfigService.detectCountryFromHeaders(headers);
    }
    
    return this.marketConfigService.getConfig(countryCode);
  }

  /**
   * Get all market configs (Admin only)
   * GET /api/admin/market-config
   */
  @Get('/admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllConfigs() {
    return this.marketConfigService.getAllConfigs();
  }

  /**
   * Update market config (Admin only)
   * PATCH /api/admin/market-config/:countryCode
   */
  @Patch('/admin/:countryCode')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateConfig(
    @Param('countryCode') countryCode: string,
    @Body() dto: UpdateMarketConfigDto,
  ) {
    return this.marketConfigService.updateConfig(countryCode, dto);
  }

  /**
   * Seed all market configs (Admin only)
   * GET /api/market/admin/seed
   */
  @Get('/admin/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async seedConfigs() {
    return this.marketConfigService.seedAllConfigs();
  }
}
