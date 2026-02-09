import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PlatformConfigService } from "./platform-config.service";

@ApiTags("platform-config")
@Controller("platform-config")
export class PlatformConfigController {
  constructor(private configService: PlatformConfigService) {}

  @Get()
  @ApiOperation({ summary: "Get all platform configuration values" })
  async getAll() {
    const configs = await this.configService.getAll();
    return { data: configs };
  }

  @Get("public")
  @ApiOperation({
    summary: "Get public platform config (commission %, making charge caps)",
  })
  async getPublic() {
    const [platformCommission, defaultMakingCharge, makingChargeCapStandard] =
      await Promise.all([
        this.configService.getPlatformCommissionRate(),
        this.configService.getDefaultMakingChargePercent(),
        this.configService.getValue(
          PlatformConfigService.KEYS.MAKING_CHARGE_CAP_STANDARD,
        ),
      ]);

    return {
      data: {
        platformCommissionRate: platformCommission,
        defaultMakingChargePercent: defaultMakingCharge,
        makingChargeCapStandard,
      },
    };
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update platform configuration values (admin only)",
  })
  async update(
    @Body() body: Record<string, number>,
    @CurrentUser("id") adminId: string,
  ) {
    await this.configService.setMany(body, adminId);
    const updated = await this.configService.getAll();
    return { message: "Configuration updated successfully", data: updated };
  }
}
