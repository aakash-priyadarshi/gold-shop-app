import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateRepairDto, UpdateRepairStatusDto } from "./dto/repair.dto";
import { RepairsService } from "./repairs.service";

// NOTE: Repair tracking is a core USP feature and is intentionally NOT gated
// behind a paid plan. Only AI + enterprise modules keep @RequireFeature.
@ApiTags("repairs")
@Controller("repairs")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RepairsController {
  constructor(private readonly repairsService: RepairsService) {}

  @Post()
  @ApiOperation({ summary: "Log a repair job (idempotent on clientId)" })
  async create(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: CreateRepairDto,
  ) {
    return this.repairsService.create(shopId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List repair jobs for the current shop" })
  async list(
    @CurrentUser("shopId") shopId: string,
    @Query("limit") limit?: string,
  ) {
    if (!shopId) return { items: [] };
    return this.repairsService.list(shopId, parseInt(limit || "50", 10));
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update a repair job's status" })
  async updateStatus(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Body() dto: UpdateRepairStatusDto,
  ) {
    return this.repairsService.updateStatus(shopId, id, dto);
  }
}
