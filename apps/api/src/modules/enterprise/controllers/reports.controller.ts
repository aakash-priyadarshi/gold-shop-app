import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { FeatureGateGuard } from "../../subscriptions/feature-gate.guard";
import { RequireFeature } from "../../subscriptions/require-feature.decorator";
import { ReportsService } from "../services/reports.service";

@ApiTags("enterprise/reports")
@Controller("enterprise/reports")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGateGuard)
@RequireFeature("scheduledReports")
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post("scheduled")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Create a scheduled report" })
  async createScheduled(
    @CurrentUser("activeShopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body()
    body: {
      reportType: string;
      frequency: string;
      recipients: string[];
      format?: string;
      filters?: Record<string, unknown>;
    },
  ) {
    return this.reportsService.createScheduledReport(shopId, userId, body);
  }

  @Get("scheduled")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "List scheduled reports" })
  async listScheduled(@CurrentUser("activeShopId") shopId: string) {
    return this.reportsService.listScheduledReports(shopId);
  }

  @Patch("scheduled/:id")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Update a scheduled report" })
  async updateScheduled(
    @CurrentUser("activeShopId") shopId: string,
    @Param("id") id: string,
    @Body()
    body: Partial<{
      frequency: string;
      recipients: string[];
      format: string;
      filters: Record<string, unknown>;
      isActive: boolean;
    }>,
  ) {
    return this.reportsService.updateScheduledReport(shopId, id, body);
  }

  @Delete("scheduled/:id")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Delete a scheduled report" })
  async deleteScheduled(
    @CurrentUser("activeShopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.reportsService.deleteScheduledReport(shopId, id);
  }

  @Get("generate")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Generate an on-demand report" })
  async generate(
    @CurrentUser("activeShopId") shopId: string,
    @Query("type") reportType: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    return this.reportsService.generateReport(shopId, reportType, {
      dateFrom,
      dateTo,
    });
  }
}
