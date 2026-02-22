import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { AuditService } from "../../audit/audit.service";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { FeatureGateGuard } from "../../subscriptions/feature-gate.guard";
import { RequireFeature } from "../../subscriptions/require-feature.decorator";
import { ApiKeyService } from "../services/api-key.service";

@ApiTags("enterprise/api-keys")
@Controller("enterprise/api-keys")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGateGuard)
@RequireFeature("apiAccess")
@ApiBearerAuth()
export class ApiKeyController {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Create a new API key (shown once)" })
  async create(
    @CurrentUser("activeShopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body()
    body: {
      keyName: string;
      scopes: string[];
      expiresAt?: string;
    },
  ) {
    const result = await this.apiKeyService.createApiKey(shopId, userId, {
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });

    await this.auditService.log({
      userId,
      actorType: "SHOPKEEPER",
      action: "CREATE_API_KEY",
      resourceType: "ShopApiKey",
      resourceId: result.id,
      newValue: { keyName: body.keyName, scopes: body.scopes },
    });

    return result;
  }

  @Get()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "List API keys (without secrets)" })
  async list(@CurrentUser("activeShopId") shopId: string) {
    return this.apiKeyService.listApiKeys(shopId);
  }

  @Get("scopes")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "List available API scopes" })
  async getScopes() {
    return this.apiKeyService.getAvailableScopes();
  }

  @Delete(":id")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Revoke an API key" })
  async revoke(
    @CurrentUser("activeShopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
  ) {
    const result = await this.apiKeyService.revokeApiKey(shopId, id);

    await this.auditService.log({
      userId,
      actorType: "SHOPKEEPER",
      action: "REVOKE_API_KEY",
      resourceType: "ShopApiKey",
      resourceId: id,
    });

    return result;
  }
}
