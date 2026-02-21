import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { EnterpriseGuard } from "../guards/enterprise.guard";
import { WebhookService } from "../services/webhook.service";

@ApiTags("enterprise/webhooks")
@Controller("enterprise/webhooks")
@UseGuards(JwtAuthGuard, RolesGuard, EnterpriseGuard)
@ApiBearerAuth()
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({
    summary: "Create webhook subscription (HMAC secret shown once)",
  })
  async create(
    @CurrentUser("activeShopId") shopId: string,
    @Body() body: { url: string; events: string[] },
  ) {
    return this.webhookService.createWebhook(shopId, body);
  }

  @Get()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "List webhook subscriptions" })
  async list(@CurrentUser("activeShopId") shopId: string) {
    return this.webhookService.listWebhooks(shopId);
  }

  @Get("events")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "List available webhook events" })
  async getEvents() {
    return this.webhookService.getAvailableEvents();
  }

  @Patch(":id")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Update webhook URL/events/active status" })
  async update(
    @CurrentUser("activeShopId") shopId: string,
    @Param("id") id: string,
    @Body() body: Partial<{ url: string; events: string[]; isActive: boolean }>,
  ) {
    return this.webhookService.updateWebhook(shopId, id, body);
  }

  @Delete(":id")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Delete webhook subscription" })
  async remove(
    @CurrentUser("activeShopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.webhookService.deleteWebhook(shopId, id);
  }
}
