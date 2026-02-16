import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { SellerEngagementService } from "./seller-engagement.service";
import { SellerPerformanceService } from "./seller-performance.service";

@ApiTags("seller-performance")
@Controller("seller-performance")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SellerPerformanceController {
  constructor(
    private performanceService: SellerPerformanceService,
    private engagementService: SellerEngagementService,
  ) {}

  @Get("my-dashboard")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({
    summary: "Get seller performance dashboard for current shop",
  })
  async getMyDashboard(
    @CurrentUser("shopId") shopId: string,
    @Query("targetTier") targetTier?: string,
  ) {
    return this.performanceService.getDashboard(shopId, targetTier);
  }

  /* ─── HEALTH SCORE ─── */

  @Get("health-score")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get health score for current shop" })
  async getMyHealthScore(@CurrentUser("shopId") shopId: string) {
    return this.engagementService.calculateHealthScore(shopId);
  }

  /* ─── ONBOARDING ─── */

  @Get("onboarding")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get onboarding progress for current shop" })
  async getMyOnboarding(@CurrentUser("shopId") shopId: string) {
    return this.engagementService.getOnboardingProgress(shopId);
  }

  /* ─── MILESTONES ─── */

  @Get("milestones")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get milestones & achievements for current shop" })
  async getMyMilestones(@CurrentUser("shopId") shopId: string) {
    return this.engagementService.getMilestones(shopId);
  }

  /* ─── RFQ FUNNEL ─── */

  @Get("rfq-funnel")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get RFQ conversion funnel for current shop" })
  async getMyRfqFunnel(
    @CurrentUser("shopId") shopId: string,
    @Query("days") days?: string,
  ) {
    return this.engagementService.getRfqFunnel(
      shopId,
      days ? parseInt(days) : 90,
    );
  }

  /* ─── ADMIN: SHOP PERFORMANCE BY ID (must be LAST — :shopId is a catch-all) ─── */

  @Get(":shopId")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Get seller performance for a specific shop (admin)",
  })
  async getShopPerformance(
    @Param("shopId") shopId: string,
    @Query("targetTier") targetTier?: string,
  ) {
    return this.performanceService.getDashboard(shopId, targetTier);
  }

  @Post("recalculate/:shopId")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Force recalculate performance for a shop (admin)" })
  async recalculate(@Param("shopId") shopId: string) {
    const result = await this.performanceService.recalculateForShop(shopId);
    return { message: "Performance recalculated", data: result };
  }

  @Post("recalculate-all")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Force recalculate all seller performance (admin)" })
  async recalculateAll() {
    await this.performanceService.recalculateAll();
    return { message: "All seller performance recalculated" };
  }
}
