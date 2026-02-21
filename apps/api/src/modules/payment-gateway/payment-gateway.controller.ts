import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuditService } from "../audit/audit.service";
import { PaymentGatewayService } from "./payment-gateway.service";

@ApiTags("payment-gateway")
@Controller("payment-gateway")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentGatewayController {
  constructor(
    private readonly gatewayService: PaymentGatewayService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Admin: Gateway Configuration ─────────────────

  @Get("configs")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "List all gateway configs (admin)" })
  async listConfigs() {
    return this.gatewayService.getGatewayConfigs();
  }

  @Get("configs/:id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get gateway config by ID (admin)" })
  async getConfig(@Param("id") id: string) {
    return this.gatewayService.getGatewayConfig(id);
  }

  @Post("configs")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create/update gateway config (admin)" })
  async upsertConfig(
    @Body()
    body: {
      gatewayName: string;
      displayName: string;
      isEnabled: boolean;
      supportedCountries: string[];
      supportedMethods: string[];
      priority: number;
      envKeyLabel: string;
      webhookEndpoint?: string;
    },
    @CurrentUser("id") adminId: string,
  ) {
    const result = await this.gatewayService.upsertGatewayConfig({
      ...body,
      updatedBy: adminId,
    });

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: result.isNew
        ? "CREATE_PAYMENT_GATEWAY_CONFIG"
        : "UPDATE_PAYMENT_GATEWAY_CONFIG",
      resourceType: "PaymentGatewayConfig",
      resourceId: result.config.id,
      previousValue: result.previousValues,
      newValue: result.config,
    });

    return result.config;
  }

  @Patch("configs/:id/toggle")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Enable/disable a gateway (admin)" })
  async toggleConfig(
    @Param("id") id: string,
    @Body("isEnabled") isEnabled: boolean,
    @CurrentUser("id") adminId: string,
  ) {
    const config = await this.gatewayService.toggleGateway(
      id,
      isEnabled,
      adminId,
    );

    await this.auditService.log({
      userId: adminId,
      actorType: "ADMIN",
      action: isEnabled
        ? "ENABLE_PAYMENT_GATEWAY"
        : "DISABLE_PAYMENT_GATEWAY",
      resourceType: "PaymentGatewayConfig",
      resourceId: id,
      newValue: { isEnabled, gatewayName: config.gatewayName },
    });

    return config;
  }
}
