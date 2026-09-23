import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole, WorkshopLedgerVersion } from "@prisma/client";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { FeatureGateGuard } from "../../core/subscriptions/feature-gate.guard";
import { RequireFeature } from "../../core/subscriptions/require-feature.decorator";
import { PrismaService } from "../../../prisma/prisma.service";
import { WorkshopScaleService } from "./workshop-scale.service";
import {
  CaptureWeighingSessionDto,
  ConfirmWeighingSessionDto,
  CreateWeighingSessionDto,
  UpdateWorkshopLedgerVersionDto,
} from "./dto/workshop-weighing.dto";

@ApiTags("karigar-workshop-traceable")
@Controller("karigar/workshop")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGateGuard)
@Roles(UserRole.SHOPKEEPER, UserRole.ADMIN)
@ApiBearerAuth()
export class WorkshopTraceableController {
  constructor(
    private readonly scale: WorkshopScaleService,
    private readonly prisma: PrismaService,
  ) {}

  private requireShop(shopId: string | undefined): string {
    if (!shopId) {
      throw new BadRequestException("No active shop selected");
    }
    return shopId;
  }

  @Patch("ledger-version")
  @RequireFeature("workshopManufacturing")
  @ApiOperation({ summary: "Set LEGACY vs TRACEABLE workshop metal ledger" })
  async setLedgerVersion(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: UpdateWorkshopLedgerVersionDto,
  ) {
    const id = this.requireShop(shopId);
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      select: { workshopMode: true, workshopLedgerVersion: true },
    });
    if (!shop) throw new NotFoundException("Shop not found");
    if (
      shop.workshopLedgerVersion === WorkshopLedgerVersion.TRACEABLE &&
      dto.workshopLedgerVersion === WorkshopLedgerVersion.LEGACY
    ) {
      throw new BadRequestException(
        "A traceable workshop ledger cannot return to LEGACY mode",
      );
    }
    if (dto.workshopLedgerVersion === WorkshopLedgerVersion.LEGACY) {
      return { id, workshopLedgerVersion: WorkshopLedgerVersion.LEGACY };
    }
    if (
      dto.workshopLedgerVersion === "TRACEABLE" &&
      !shop.workshopMode
    ) {
      throw new BadRequestException(
        "Enable Workshop Mode before enabling the traceable metal journal",
      );
    }
    const updated = await this.prisma.shop.update({
      where: { id },
      data: {
        workshopLedgerVersion: dto.workshopLedgerVersion as WorkshopLedgerVersion,
      },
      select: { id: true, workshopLedgerVersion: true },
    });
    return updated;
  }

  @Get("metal/accounts")
  @RequireFeature("workshopManufacturing")
  @ApiOperation({ summary: "TRACEABLE Gold 995 metal account balances" })
  async accounts(@CurrentUser("shopId") shopId: string) {
    return this.scale.listAccounts(this.requireShop(shopId));
  }

  @Post("simulator/device")
  @RequireFeature("workshopManufacturing")
  @ApiOperation({ summary: "Ensure the shop Gold Scale simulator device" })
  async simulatorDevice(@CurrentUser("shopId") shopId: string) {
    return this.scale.ensureGoldSimulatorDevice(this.requireShop(shopId));
  }

  @Post("weighing-sessions")
  @RequireFeature("workshopManufacturing")
  @ApiOperation({ summary: "Open a Gold 995 weighing session for a casting tree" })
  async createSession(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateWeighingSessionDto,
  ) {
    return this.scale.createSession(this.requireShop(shopId), userId, dto);
  }

  @Get("weighing-sessions/:id")
  @RequireFeature("workshopManufacturing")
  async getSession(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.scale.getSession(this.requireShop(shopId), id);
  }

  @Post("weighing-sessions/:id/capture")
  @RequireFeature("workshopManufacturing")
  @ApiOperation({ summary: "Persist a stable Gold Scale reading on the session" })
  async capture(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body() dto: CaptureWeighingSessionDto,
  ) {
    return this.scale.capture(this.requireShop(shopId), userId, id, dto);
  }

  @Post("weighing-sessions/:id/confirm")
  @RequireFeature("workshopManufacturing")
  @ApiOperation({
    summary: "Post Gold 995 vault → tree WIP from captured readingId only",
  })
  async confirm(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body() dto: ConfirmWeighingSessionDto,
  ) {
    return this.scale.confirm(this.requireShop(shopId), userId, id, dto);
  }
}
