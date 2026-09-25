import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { FeatureGateGuard } from "../../core/subscriptions/feature-gate.guard";
import { RequireFeature } from "../../core/subscriptions/require-feature.decorator";
import { ClassifyWorkshopRecoveryDto, CreateWorkshopRecoveryContainerDto, CreateWorkshopRecoveryEventDto, WorkshopAssayDto } from "./dto/workshop-recovery.dto";
import { WorkshopPermissionGuard, RequireWorkshopAbility } from "./workshop-permission.guard";
import { WorkshopRecoveryService } from "./workshop-recovery.service";

@ApiTags("karigar-workshop-recovery")
@ApiBearerAuth()
@Controller("karigar/workshop/recovery")
@UseGuards(JwtAuthGuard, WorkshopPermissionGuard, FeatureGateGuard)
@RequireFeature("workshopManufacturing")
export class WorkshopRecoveryController {
  constructor(private readonly recovery: WorkshopRecoveryService) {}
  private shop(id?: string) { if (!id) throw new BadRequestException("No active shop selected"); return id; }

  @Get("containers")
  list(@CurrentUser("shopId") shopId: string) { return this.recovery.list(this.shop(shopId)); }

  @Post("containers")
  createContainer(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: CreateWorkshopRecoveryContainerDto) {
    return this.recovery.createContainer(this.shop(shopId), userId, dto);
  }

  @Get("containers/:id")
  detail(@CurrentUser("shopId") shopId: string, @Param("id") id: string) { return this.recovery.bagDetail(this.shop(shopId), id); }

  @Post("events")
  @RequireWorkshopAbility("workshopApprove")
  createEvent(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: CreateWorkshopRecoveryEventDto) {
    return this.recovery.createEvent(this.shop(shopId), userId, dto.containerId);
  }

  @Get("events/:id")
  event(@CurrentUser("shopId") shopId: string, @Param("id") id: string) { return this.recovery.eventDetail(this.shop(shopId), id); }

  @Post("assays")
  @RequireWorkshopAbility("workshopApprove")
  assay(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: WorkshopAssayDto) {
    return this.recovery.recordAssay(this.shop(shopId), userId, dto);
  }

  @Post("events/:id/classify-and-close")
  @RequireWorkshopAbility("workshopApprove")
  classify(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Param("id") id: string, @Body() dto: ClassifyWorkshopRecoveryDto) {
    return this.recovery.classifyAndClose(this.shop(shopId), userId, id, dto.reason);
  }
}
