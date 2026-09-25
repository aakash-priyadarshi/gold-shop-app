import { BadRequestException, Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { FeatureGateGuard } from "../../core/subscriptions/feature-gate.guard";
import { RequireFeature } from "../../core/subscriptions/require-feature.decorator";
import { WorkshopControlService } from "./workshop-control.service";
import { RequireWorkshopAbility, WorkshopPermissionGuard } from "./workshop-permission.guard";
import { CorrectWorkshopJournalDto, WorkshopManualMovementDto, WorkshopMaterialOpeningDto } from "./dto/workshop-control.dto";

@ApiTags("karigar-workshop-controls")
@ApiBearerAuth()
@Controller("karigar/workshop")
@UseGuards(JwtAuthGuard, WorkshopPermissionGuard, FeatureGateGuard)
@RequireFeature("workshopManufacturing")
export class WorkshopControlController {
  constructor(private readonly control: WorkshopControlService) {}

  private shop(id?: string) {
    if (!id) throw new BadRequestException("No active shop selected");
    return id;
  }

  @Post("manual-movements")
  @RequireWorkshopAbility("workshopManualOverride")
  manual(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: WorkshopManualMovementDto) {
    return this.control.manualMovement(this.shop(shopId), userId, dto);
  }

  @Post("materials/opening")
  @RequireWorkshopAbility("workshopManualOverride")
  opening(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Body() dto: WorkshopMaterialOpeningDto) {
    return this.control.materialOpening(this.shop(shopId), userId, dto);
  }

  @Post("journals/:id/correct")
  @RequireWorkshopAbility("workshopCorrect")
  correct(@CurrentUser("shopId") shopId: string, @CurrentUser("id") userId: string, @Param("id") id: string, @Body() dto: CorrectWorkshopJournalDto) {
    return this.control.correctJournal(this.shop(shopId), userId, id, dto);
  }
}
