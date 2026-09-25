import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { FeatureGateGuard } from "../../core/subscriptions/feature-gate.guard";
import { RequireFeature } from "../../core/subscriptions/require-feature.decorator";
import { ApproveWorkshopTransferDto, CreateWorkshopTransferDto, ReconcileWorkshopTransferDto } from "./dto/workshop-transfer.dto";
import { WorkshopPermissionGuard, RequireWorkshopAbility } from "./workshop-permission.guard";
import { WorkshopTransferService } from "./workshop-transfer.service";

@ApiTags("karigar-workshop-transfers")
@ApiBearerAuth()
@Controller("karigar/workshop/transfers")
@UseGuards(JwtAuthGuard, WorkshopPermissionGuard, FeatureGateGuard)
@RequireFeature("workshopManufacturing")
export class WorkshopTransferController {
  constructor(private readonly transfers: WorkshopTransferService) {}
  private shop(id?: string) { if (!id) throw new BadRequestException("No active shop selected"); return id; }

  @Get()
  list(@CurrentUser("shopId") shopId: string) { return this.transfers.list(this.shop(shopId)); }

  @Post()
  create(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: CreateWorkshopTransferDto) {
    return this.transfers.create(this.shop(shopId), userId, dto);
  }

  @Post(":id/approve")
  @RequireWorkshopAbility("workshopApprove")
  approve(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Param("id") id: string, @Body() dto: ApproveWorkshopTransferDto) {
    return this.transfers.approve(this.shop(shopId), userId, id, dto.reason);
  }

  @Post(":id/classify-difference")
  @RequireWorkshopAbility("workshopApprove")
  classify(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Param("id") id: string, @Body() dto: ReconcileWorkshopTransferDto) {
    return this.transfers.classifyDifference(this.shop(shopId), userId, id, dto.classificationReason, dto.sourceAccountId);
  }

  @Post(":id/cancel")
  @RequireWorkshopAbility("workshopApprove")
  cancel(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.transfers.cancelPrepared(this.shop(shopId), userId, id);
  }
}
