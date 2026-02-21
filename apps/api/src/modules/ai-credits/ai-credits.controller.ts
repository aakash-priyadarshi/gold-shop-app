import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuditService } from "../audit/audit.service";
import { AiCreditsService } from "./ai-credits.service";

@ApiTags("ai-credits")
@Controller("ai-credits")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AiCreditsController {
  constructor(
    private readonly creditsService: AiCreditsService,
    private readonly auditService: AuditService,
  ) {}

  // ─── User endpoints ───────────────────────────────

  @Get("balance")
  @ApiOperation({ summary: "Get my AI credit balance + recent transactions" })
  async getMyBalance(@CurrentUser("id") userId: string) {
    return this.creditsService.getUserCredits(userId);
  }

  @Get("ledger")
  @ApiOperation({ summary: "Get my credit ledger with pagination" })
  async getMyLedger(
    @CurrentUser("id") userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("action") action?: string,
  ) {
    return this.creditsService.getUserLedger(userId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      action,
    });
  }

  // ─── Admin endpoints ──────────────────────────────

  @Get("admin/user/:userId")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get user credit balance + ledger (admin)" })
  async getUserCredits(@Param("userId") userId: string) {
    return this.creditsService.getUserCredits(userId);
  }

  @Get("admin/user/:userId/ledger")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get full user credit ledger (admin)" })
  async getUserLedger(
    @Param("userId") userId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("action") action?: string,
  ) {
    return this.creditsService.getUserLedger(userId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      action,
    });
  }

  @Post("admin/adjust")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Manually adjust user credits (admin)" })
  async adminAdjust(
    @Body() body: { userId: string; amount: number; reason: string },
    @CurrentUser("id") adminId: string,
  ) {
    const result = await this.creditsService.adminAdjust({
      userId: body.userId,
      amount: body.amount,
      reason: body.reason,
      adminId,
    });

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: "ADMIN_ADJUST_AI_CREDITS",
      resourceType: "AiCreditLedger",
      resourceId: result.ledgerEntry.id,
      newValue: {
        targetUserId: body.userId,
        amount: body.amount,
        reason: body.reason,
        balanceAfter: result.balanceAfter,
      },
    });

    return result;
  }

  @Post("admin/monthly-grant")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Trigger monthly credit grant manually (admin)" })
  async triggerMonthlyGrant(@CurrentUser("id") adminId: string) {
    const result = await this.creditsService.processMonthlyGrants();

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: "TRIGGER_MONTHLY_CREDIT_GRANT",
      resourceType: "AiCreditLedger",
      newValue: result,
    });

    return result;
  }

  @Get("admin/stats")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get AI credit statistics (admin)" })
  async getStats() {
    return this.creditsService.getCreditStats();
  }
}
