import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { FeatureGateGuard } from "../../subscriptions/feature-gate.guard";
import { RequireFeature } from "../../subscriptions/require-feature.decorator";
import { ForecastService } from "../services/forecast.service";

@ApiTags("enterprise/forecasts")
@Controller("enterprise/forecasts")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGateGuard)
@RequireFeature("demandForecasting")
@ApiBearerAuth()
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Get()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get demand forecasts" })
  async getForecasts(
    @CurrentUser("activeShopId") shopId: string,
    @Query("period") period?: string,
  ) {
    return this.forecastService.getForecasts(shopId, period);
  }

  @Post("generate")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({
    summary: "Generate new demand forecasts from historical data",
  })
  async generate(@CurrentUser("activeShopId") shopId: string) {
    return this.forecastService.generateForecasts(shopId);
  }

  @Get("recommendations")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get AI-powered recommendations" })
  async getRecommendations(@CurrentUser("activeShopId") shopId: string) {
    return this.forecastService.getRecommendations(shopId);
  }
}
