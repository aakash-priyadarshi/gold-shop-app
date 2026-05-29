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
import { FeatureGateGuard } from "../subscriptions/feature-gate.guard";
import { RequireFeature } from "../subscriptions/require-feature.decorator";
import {
  CreateGoldLoanDto,
  UpdateGoldLoanStatusDto,
} from "./dto/gold-loan.dto";
import { GoldLoansService } from "./gold-loans.service";

@ApiTags("gold-loans")
@Controller("gold-loans")
@UseGuards(JwtAuthGuard, FeatureGateGuard)
@RequireFeature("lending")
@ApiBearerAuth()
export class GoldLoansController {
  constructor(private readonly goldLoansService: GoldLoansService) {}

  @Post()
  @ApiOperation({ summary: "Create a gold loan (idempotent on clientId)" })
  async create(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: CreateGoldLoanDto,
  ) {
    return this.goldLoansService.create(shopId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List gold loans for the current shop" })
  async list(
    @CurrentUser("shopId") shopId: string,
    @Query("limit") limit?: string,
  ) {
    if (!shopId) return { items: [] };
    return this.goldLoansService.list(shopId, parseInt(limit || "200", 10));
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update a gold loan status (redeem / default)" })
  async updateStatus(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Body() dto: UpdateGoldLoanStatusDto,
  ) {
    return this.goldLoansService.updateStatus(shopId, id, dto);
  }
}
