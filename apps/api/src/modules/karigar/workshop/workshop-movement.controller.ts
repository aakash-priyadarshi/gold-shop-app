import { BadRequestException, Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { FeatureGateGuard } from "../../core/subscriptions/feature-gate.guard";
import { RequireFeature } from "../../core/subscriptions/require-feature.decorator";
import { WorkshopMovementService } from "./workshop-movement.service";
import { WorkshopPermissionGuard } from "./workshop-permission.guard";
import { ConfirmWorkshopMovementDto, CreateWorkshopMovementSessionDto } from "./dto/workshop-movement.dto";

@ApiTags("karigar-workshop-movements")
@ApiBearerAuth()
@Controller("karigar/workshop")
@UseGuards(JwtAuthGuard, WorkshopPermissionGuard, FeatureGateGuard)
@RequireFeature("workshopManufacturing")
export class WorkshopMovementController {
  constructor(private readonly movements: WorkshopMovementService) {}

  private shop(id?: string) {
    if (!id) throw new BadRequestException("No active shop selected");
    return id;
  }

  @Post("movement-sessions")
  createSession(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: CreateWorkshopMovementSessionDto) {
    return this.movements.createSession(this.shop(shopId), userId, dto);
  }

  @Post("movement-sessions/:id/confirm")
  confirm(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Param("id") id: string, @Body() dto: ConfirmWorkshopMovementDto) {
    return this.movements.confirm(this.shop(shopId), userId, id, dto);
  }
}
