import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { SellerPerformanceService } from "./seller-performance.service";

@ApiTags("seller-performance")
@Controller("seller-performance")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SellerPerformanceController {
  constructor(private performanceService: SellerPerformanceService) {}

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
