import {
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Post,
} from "@nestjs/common";
import { CommissionService } from "./commission.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole, CommissionStatus } from "@prisma/client";

@Controller("commission")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  /**
   * Get all commissions with optional filters (admin only)
   * GET /api/commission/admin/list?status=PENDING&shopId=xxx&page=1&limit=20
   */
  @Get("admin/list")
  @Roles(UserRole.ADMIN)
  async getAllCommissions(
    @Query("status") status?: CommissionStatus,
    @Query("shopId") shopId?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const result = await this.commissionService.getAllCommissions({
      status,
      shopId,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return {
      commissions: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.pages,
    };
  }

  /**
   * Get commission stats (admin only)
   * GET /api/commission/admin/stats
   */
  @Get("admin/stats")
  @Roles(UserRole.ADMIN)
  async getCommissionStats() {
    return this.commissionService.getCommissionStats();
  }

  /**
   * Mark commission as paid (admin only)
   * POST /api/commission/admin/:id/mark-paid
   */
  @Post("admin/:id/mark-paid")
  @Roles(UserRole.ADMIN)
  async markCommissionPaid(
    @Param("id") id: string,
    @Body("notes") notes?: string,
  ) {
    return this.commissionService.markCommissionPaid(id, notes);
  }

  /**
   * Release shop hold (admin only)
   * POST /api/commission/admin/shop/:shopId/release-hold
   */
  @Post("admin/shop/:shopId/release-hold")
  @Roles(UserRole.ADMIN)
  async releaseShopHold(@Param("shopId") shopId: string) {
    return this.commissionService.releaseShopHold(shopId);
  }

  /**
   * Waive commission (admin only)
   * PATCH /api/commission/admin/:id/waive
   */
  @Patch("admin/:id/waive")
  @Roles(UserRole.ADMIN)
  async waiveCommission(
    @Param("id") id: string,
    @Body("reason") reason: string,
  ) {
    return this.commissionService.waiveCommission(id, reason);
  }

  /**
   * Process overdue commissions (can be called manually or by cron)
   * POST /api/commission/admin/process-overdue
   */
  @Post("admin/process-overdue")
  @Roles(UserRole.ADMIN)
  async processOverdueCommissions() {
    return this.commissionService.processOverdueCommissions();
  }

  /**
   * Get shop's commission summary (for shopkeeper)
   * GET /api/commission/shop/:shopId/summary
   */
  @Get("shop/:shopId/summary")
  @Roles(UserRole.ADMIN, UserRole.SHOPKEEPER)
  async getShopCommissionSummary(
    @Param("shopId") shopId: string,
    @CurrentUser("shopId") userShopId: string,
    @CurrentUser("role") userRole: string,
  ) {
    if (userRole === "SHOPKEEPER" && shopId !== userShopId) {
      throw new ForbiddenException(
        "You can only access your own commission data",
      );
    }
    return this.commissionService.getShopCommissionSummary(shopId);
  }

  /**
   * Get shop's commission ledger (for shopkeeper)
   * GET /api/commission/shop/:shopId/ledger
   */
  @Get("shop/:shopId/ledger")
  @Roles(UserRole.ADMIN, UserRole.SHOPKEEPER)
  async getShopCommissions(
    @Param("shopId") shopId: string,
    @CurrentUser("shopId") userShopId: string,
    @CurrentUser("role") userRole: string,
  ) {
    if (userRole === "SHOPKEEPER" && shopId !== userShopId) {
      throw new ForbiddenException(
        "You can only access your own commission data",
      );
    }
    return this.commissionService.getShopCommissions(shopId);
  }
}
