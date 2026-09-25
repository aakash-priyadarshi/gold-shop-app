import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { FeatureGateGuard } from "../../core/subscriptions/feature-gate.guard";
import { RequireFeature } from "../../core/subscriptions/require-feature.decorator";
import { RouteJobDto, RouteStepChangeDto } from "./dto/workshop-catalog.dto";
import { ClassifyWorkshopVarianceDto, CompleteWorkshopRunDto, CreateWorkshopChildDto, InspectTraceableQcDto, StartWorkshopProcessDto } from "./dto/workshop-production.dto";
import { WorkshopPermissionGuard, RequireWorkshopAbility } from "./workshop-permission.guard";
import { WorkshopProductionService } from "./workshop-production.service";

@ApiTags("karigar-workshop-production")
@ApiBearerAuth()
@Controller("karigar/workshop")
@UseGuards(JwtAuthGuard, WorkshopPermissionGuard, FeatureGateGuard)
@RequireFeature("workshopManufacturing")
export class WorkshopProductionController {
  constructor(private readonly production: WorkshopProductionService) {}
  private shop(id?: string) { if (!id) throw new BadRequestException("No active shop selected"); return id; }

  @Get("jobs")
  jobs(@CurrentUser("shopId") shopId: string) {
    return this.production.listJobs(this.shop(shopId));
  }

  @Post("jobs/:id/qc")
  @RequireWorkshopAbility("workshopApprove")
  inspectQc(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Param("id") jobId: string, @Body() dto: InspectTraceableQcDto) {
    return this.production.inspectQc(this.shop(shopId), userId, jobId, dto);
  }

  @Post("jobs/:id/route")
  @RequireWorkshopAbility("workshopApprove")
  assignRoute(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Param("id") jobId: string, @Body() dto: RouteJobDto) {
    return this.production.assignRoute(this.shop(shopId), userId, jobId, dto.templateId);
  }

  @Post("jobs/:jobId/route/:stepId/change")
  @RequireWorkshopAbility("workshopApprove")
  changeStep(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Param("jobId") jobId: string, @Param("stepId") stepId: string, @Body() dto: RouteStepChangeDto) {
    return this.production.changeRouteStep(this.shop(shopId), userId, jobId, stepId, dto);
  }

  @Post("batch-children")
  @RequireWorkshopAbility("workshopApprove")
  createChild(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: CreateWorkshopChildDto) {
    return this.production.createChild(this.shop(shopId), userId, dto);
  }

  @Post("process-runs")
  startRun(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: StartWorkshopProcessDto) {
    return this.production.startRun(this.shop(shopId), userId, dto);
  }

  @Get("process-runs/:id/reconciliation")
  reconciliation(@CurrentUser("shopId") shopId: string, @Param("id") id: string) {
    return this.production.runReconciliation(this.shop(shopId), id);
  }

  @Post("process-runs/:id/classify-variance")
  @RequireWorkshopAbility("workshopApprove")
  variance(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Param("id") id: string, @Body() dto: ClassifyWorkshopVarianceDto) {
    return this.production.classifyVariance(this.shop(shopId), userId, id, dto.materialKey, dto.reason);
  }

  @Post("process-runs/:id/close")
  @RequireWorkshopAbility("workshopApprove")
  close(@CurrentUser("shopId") shopId: string, @Param("id") id: string, @Body() dto: CompleteWorkshopRunDto) {
    return this.production.closeRun(this.shop(shopId), id, dto.notes);
  }

  @Get("batches/:id/reconciliation")
  batch(@CurrentUser("shopId") shopId: string, @Param("id") id: string) {
    return this.production.batchReconciliation(this.shop(shopId), id);
  }
}
