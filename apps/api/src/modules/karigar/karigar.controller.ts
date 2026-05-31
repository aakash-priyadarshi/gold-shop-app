import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SaveKarigarStateDto } from "./dto/karigar.dto";
import { KarigarService } from "./karigar.service";

// NOTE: Karigar / supply-chain tracking is a core USP feature and is
// intentionally NOT gated behind a paid plan. Only AI + enterprise modules
// keep @RequireFeature.
@ApiTags("karigar")
@Controller("karigar")
@UseGuards(JwtAuthGuard)
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
