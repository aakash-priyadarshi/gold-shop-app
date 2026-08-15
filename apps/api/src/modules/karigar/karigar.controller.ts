import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { FeatureGateGuard } from "../core/subscriptions/feature-gate.guard";
import { RequireFeature } from "../core/subscriptions/require-feature.decorator";
import {
  AdvanceKarigarFloorDto,
  CreateCastingTreeDto,
  CreateKarigarJobDto,
  CreateKarigarMovementDto,
  InspectKarigarQcDto,
  ReceiveKarigarFgDto,
  SaveKarigarStateDto,
  UpdateCastingTreeDto,
  UpdateKarigarJobDto,
  UpdateKarigarStageDto,
} from "./dto/karigar.dto";
import { KarigarService } from "./karigar.service";

@ApiTags("karigar")
@Controller("karigar")
@UseGuards(JwtAuthGuard, FeatureGateGuard)
@ApiBearerAuth()
export class KarigarController {
  constructor(private readonly karigarService: KarigarService) {}

  @Get("snapshot")
  @ApiOperation({ summary: "Get karigar supply-chain + gold-loss snapshot" })
  async getSnapshot(@CurrentUser("shopId") shopId: string) {
    if (!shopId) {
      return { vaultReserves: {}, workshops: [], jobs: [], customMaterials: [] };
    }
    return this.karigarService.getSnapshot(shopId);
  }

  @Put("snapshot")
  @ApiOperation({
    summary: "Upsert workshops and vault. Does not delete jobs or movements.",
  })
  async saveSnapshot(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: SaveKarigarStateDto,
  ) {
    if (!shopId) {
      throw new BadRequestException(
        "No active shop selected. Select a shop before saving supply-chain data.",
      );
    }
    return this.karigarService.replaceSnapshot(shopId, dto);
  }

  @Get("gold-loss")
  @ApiOperation({ summary: "Gold loss report by job, karigar, and casting tree" })
  async goldLoss(
    @CurrentUser("shopId") shopId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.goldLossReport(shopId, from, to);
  }

  @Post("sample-job")
  @ApiOperation({ summary: "Create a 1kg sample casting job for a live demo" })
  async sampleJob(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.loadSampleJob(shopId, userId);
  }

  @Get("workshop/tower")
  @RequireFeature("workshopManufacturing")
  @ApiOperation({ summary: "Workshop control-tower exceptions" })
  async workshopTower(@CurrentUser("shopId") shopId: string) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.getTower(shopId);
  }

  @Get("workshop/floor")
  @RequireFeature("workshopManufacturing")
  @ApiOperation({ summary: "Department queues for the factory floor" })
  async workshopFloor(
    @CurrentUser("shopId") shopId: string,
    @Query("dept") dept?: string,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.getFloor(shopId, dept);
  }

  @Get("jobs/:jobId")
  async getJob(
    @CurrentUser("shopId") shopId: string,
    @Param("jobId") jobId: string,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.getJob(shopId, jobId);
  }

  @Post("jobs")
  async createJob(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: CreateKarigarJobDto,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.createJob(shopId, dto);
  }

  @Patch("jobs/:jobId")
  async updateJob(
    @CurrentUser("shopId") shopId: string,
    @Param("jobId") jobId: string,
    @Body() dto: UpdateKarigarJobDto,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.updateJob(shopId, jobId, dto);
  }

  @Delete("jobs/:jobId")
  async deleteJob(
    @CurrentUser("shopId") shopId: string,
    @Param("jobId") jobId: string,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.deleteJob(shopId, jobId);
  }

  @Delete("workshops/:workshopId")
  async deleteWorkshop(
    @CurrentUser("shopId") shopId: string,
    @Param("workshopId") workshopId: string,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.deleteWorkshop(shopId, workshopId);
  }

  @Post("movements")
  async addShopMovement(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateKarigarMovementDto,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.addMovement(shopId, null, userId, dto);
  }

  @Post("jobs/:jobId/advance")
  @RequireFeature("workshopManufacturing")
  async advanceFloor(
    @CurrentUser("shopId") shopId: string,
    @Param("jobId") jobId: string,
    @Body() dto: AdvanceKarigarFloorDto,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.advanceFloor(shopId, jobId, dto);
  }

  @Post("jobs/:jobId/qc")
  @RequireFeature("workshopManufacturing")
  async inspectQc(
    @CurrentUser("shopId") shopId: string,
    @Param("jobId") jobId: string,
    @Body() dto: InspectKarigarQcDto,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.inspectQc(shopId, jobId, dto);
  }

  @Post("jobs/:jobId/receive-fg")
  @RequireFeature("workshopManufacturing")
  async receiveFg(
    @CurrentUser("shopId") shopId: string,
    @Param("jobId") jobId: string,
    @Body() dto: ReceiveKarigarFgDto,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.receiveFg(shopId, jobId, dto);
  }

  @Post("jobs/:jobId/movements")
  async addJobMovement(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Param("jobId") jobId: string,
    @Body() dto: CreateKarigarMovementDto,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.addMovement(shopId, jobId, userId, dto);
  }

  @Patch("jobs/:jobId/stages/:stage")
  async updateStage(
    @CurrentUser("shopId") shopId: string,
    @Param("jobId") jobId: string,
    @Param("stage") stage: string,
    @Body() dto: UpdateKarigarStageDto,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.updateStage(shopId, jobId, stage, dto);
  }

  @Post("jobs/:jobId/trees")
  async createTree(
    @CurrentUser("shopId") shopId: string,
    @Param("jobId") jobId: string,
    @Body() dto: CreateCastingTreeDto,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.createTree(shopId, jobId, dto);
  }

  @Patch("jobs/:jobId/trees/:treeId")
  async updateTree(
    @CurrentUser("shopId") shopId: string,
    @Param("jobId") jobId: string,
    @Param("treeId") treeId: string,
    @Body() dto: UpdateCastingTreeDto,
  ) {
    if (!shopId) throw new BadRequestException("No active shop selected");
    return this.karigarService.updateTree(shopId, jobId, treeId, dto);
  }
}
