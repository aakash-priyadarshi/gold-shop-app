import { BadRequestException, Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { FeatureGateGuard } from "../../core/subscriptions/feature-gate.guard";
import { RequireFeature } from "../../core/subscriptions/require-feature.decorator";
import { WorkshopPermissionGuard } from "./workshop-permission.guard";
import { WorkshopReportService } from "./workshop-report.service";

@ApiTags("karigar-workshop-reports")
@ApiBearerAuth()
@Controller("karigar/workshop/reports")
@UseGuards(JwtAuthGuard, WorkshopPermissionGuard, FeatureGateGuard)
@RequireFeature("workshopManufacturing")
export class WorkshopReportController {
  constructor(private readonly reports: WorkshopReportService) {}

  @Get()
  dashboard(@CurrentUser("shopId") shopId: string) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.reports.dashboard(shopId);
  }
}
