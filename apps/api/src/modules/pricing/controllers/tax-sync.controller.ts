import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { MarketRegion } from "../../market-rates/types";
import { TaxRuleSyncService } from "../services/tax-rule-sync.service";

@ApiTags("Pricing Tax Sync")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("pricing/tax-sync")
export class TaxSyncController {
  constructor(private readonly taxRuleSyncService: TaxRuleSyncService) {}

  @Get("sources")
  @ApiOperation({
    summary: "List trusted tax sources",
    description: "Returns the trusted-source registry and recent sync status for each region.",
  })
  async listSources() {
    return {
      sources: await this.taxRuleSyncService.listSources(),
    };
  }

  @Get("runs")
  @ApiOperation({
    summary: "List tax sync runs",
    description: "Returns recent automatic and manual tax sync runs.",
  })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async listRuns(@Query("limit") limit?: string) {
    return {
      runs: await this.taxRuleSyncService.listRuns(
        limit ? Number(limit) : 10,
      ),
    };
  }

  @Get("proposals")
  @ApiOperation({
    summary: "List tax change proposals",
    description: "Returns pending and historical tax change proposals for admin review.",
  })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "region", required: false, enum: ["NP", "IN", "AE", "UK", "EU", "US"] })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async listProposals(
    @Query("status") status?: string,
    @Query("region") region?: MarketRegion,
    @Query("limit") limit?: string,
  ) {
    return {
      proposals: await this.taxRuleSyncService.listProposals({
        status,
        region,
        limit: limit ? Number(limit) : 25,
      }),
    };
  }

  @Post("run")
  @ApiOperation({
    summary: "Run a trusted-source tax sync",
    description:
      "Fetches trusted sources, asks Gemini to extract explicit tax rules, and stores pending proposals without auto-applying them.",
  })
  async runSync(
    @Body() body: { region?: MarketRegion },
    @CurrentUser("id") userId?: string,
  ) {
    return {
      run: await this.taxRuleSyncService.runManualSync(userId, body?.region),
    };
  }

  @Post("proposals/:id/approve")
  @ApiOperation({
    summary: "Approve a pending tax proposal",
    description: "Applies the proposed rate to TaxRuleConfig and marks competing pending proposals as superseded.",
  })
  async approveProposal(
    @Param("id") id: string,
    @Body() body: { note?: string },
    @CurrentUser("id") userId?: string,
  ) {
    return {
      proposal: await this.taxRuleSyncService.approveProposal(
        id,
        userId,
        body?.note,
      ),
    };
  }

  @Post("proposals/:id/reject")
  @ApiOperation({
    summary: "Reject a pending tax proposal",
    description: "Marks the proposal as rejected while preserving its evidence trail.",
  })
  async rejectProposal(
    @Param("id") id: string,
    @Body() body: { note?: string },
    @CurrentUser("id") userId?: string,
  ) {
    return {
      proposal: await this.taxRuleSyncService.rejectProposal(
        id,
        userId,
        body?.note,
      ),
    };
  }
}