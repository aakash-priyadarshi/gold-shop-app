import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { FeatureGateGuard } from "../subscriptions/feature-gate.guard";
import { RequireFeature } from "../subscriptions/require-feature.decorator";
import { SaveKarigarStateDto } from "./dto/karigar.dto";
import { KarigarService } from "./karigar.service";

@ApiTags("karigar")
@Controller("karigar")
@UseGuards(JwtAuthGuard, FeatureGateGuard)
@RequireFeature("karigarSupplyChain")
@ApiBearerAuth()
export class KarigarController {
  constructor(private readonly karigarService: KarigarService) {}

  @Get("snapshot")
  @ApiOperation({ summary: "Get the full karigar/supply-chain state" })
  async getSnapshot(@CurrentUser("shopId") shopId: string) {
    if (!shopId) {
      return { vaultReserves: {}, workshops: [], jobs: [], customMaterials: [] };
    }
    return this.karigarService.getSnapshot(shopId);
  }

  @Put("snapshot")
  @ApiOperation({ summary: "Replace the full karigar/supply-chain state" })
  async saveSnapshot(
    @CurrentUser("shopId") shopId: string,
    @Body() dto: SaveKarigarStateDto,
  ) {
    return this.karigarService.replaceSnapshot(shopId, dto);
  }
}
