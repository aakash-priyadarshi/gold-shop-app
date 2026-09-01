import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  Response,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import { AuditService } from "../audit/audit.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ApiKeyService } from "../enterprise/services/api-key.service";
import { CreateSellerAiKeyDto, SELLER_AI_SCOPES } from "./dto/seller-ai.dto";
import {
  SellerAiApiKeyContext,
  SellerAiApiKeyGuard,
} from "./seller-ai-api-key.guard";
import { SellerAiService } from "./seller-ai.service";

type SellerAiRequest = ExpressRequest & { sellerAiKey: SellerAiApiKeyContext };

@ApiTags("seller-ai")
@Controller("seller-ai")
export class SellerAiController {
  constructor(
    private readonly apiKeys: ApiKeyService,
    private readonly sellerAi: SellerAiService,
    private readonly audit: AuditService,
  ) {}

  @Get("keys")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List seller AI keys without their secrets" })
  async listKeys(@CurrentUser("activeShopId") shopId: string) {
    this.requireShop(shopId);
    return this.apiKeys.listSellerAiKeys(shopId);
  }

  @Get("scopes")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List scopes supported by seller MCP" })
  getScopes() {
    return { scopes: SELLER_AI_SCOPES };
  }

  @Post("keys")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a seller AI key (secret is shown once)" })
  async createKey(
    @CurrentUser("activeShopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body() body: CreateSellerAiKeyDto,
  ) {
    this.requireShop(shopId);
    const keyName = body.name.trim();
    if (keyName.length < 3) {
      throw new BadRequestException(
        "Key name must contain at least 3 characters",
      );
    }
    const expiresAt = new Date(
      Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000,
    );
    const key = await this.apiKeys.createApiKey(shopId, userId, {
      keyName,
      scopes: body.scopes,
      expiresAt,
      kind: "SELLER_AI",
    });
    await this.audit.log({
      userId,
      actorType: "SHOPKEEPER",
      action: "CREATE_SELLER_AI_KEY",
      resourceType: "ShopApiKey",
      resourceId: key.id,
      newValue: {
        keyName: key.keyName,
        scopes: key.scopes,
        expiresAt: key.expiresAt,
      },
    });
    return key;
  }

  @Delete("keys/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke a seller AI key" })
  async revokeKey(
    @CurrentUser("activeShopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Param("id") keyId: string,
  ) {
    this.requireShop(shopId);
    await this.apiKeys.revokeApiKey(shopId, keyId);
    await this.audit.log({
      userId,
      actorType: "SHOPKEEPER",
      action: "REVOKE_SELLER_AI_KEY",
      resourceType: "ShopApiKey",
      resourceId: keyId,
      metadata: { shopId },
    });
  }

  @Get("actions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List seller AI write proposals and their outcomes",
  })
  async listActions(@CurrentUser("activeShopId") shopId: string) {
    this.requireShop(shopId);
    return this.sellerAi.listActions(shopId);
  }

  @Post("actions/:id/confirm")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Confirm a pending seller AI write proposal" })
  async confirmAction(
    @CurrentUser("activeShopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Param("id") actionId: string,
  ) {
    this.requireShop(shopId);
    return this.sellerAi.confirmAction(shopId, actionId, userId);
  }

  @Post("actions/:id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reject a pending seller AI write proposal" })
  async rejectAction(
    @CurrentUser("activeShopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Param("id") actionId: string,
  ) {
    this.requireShop(shopId);
    return this.sellerAi.rejectAction(shopId, actionId, userId);
  }

  @Post("mcp")
  @UseGuards(SellerAiApiKeyGuard)
  @ApiOperation({ summary: "Seller MCP Streamable HTTP endpoint" })
  async handleMcp(
    @Request() request: SellerAiRequest,
    @Response() response: ExpressResponse,
  ): Promise<void> {
    const result = await this.sellerAi.handleMcp(
      request.sellerAiKey,
      request.body,
      {
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      },
    );
    if (result === null) {
      response.status(HttpStatus.ACCEPTED).send();
      return;
    }
    response
      .setHeader("MCP-Protocol-Version", "2025-03-26")
      .type("application/json")
      .status(HttpStatus.OK)
      .send(result);
  }

  private requireShop(shopId: string | undefined): asserts shopId is string {
    if (!shopId) {
      throw new BadRequestException(
        "Select a shop before managing AI integrations",
      );
    }
  }
}
