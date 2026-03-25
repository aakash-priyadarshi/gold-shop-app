import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { SkipSecurity } from "../security/security.guard";
import { CatalogueService } from "./catalogue.service";
import { UnlockCatalogueDto } from "./dto/unlock-catalogue.dto";

@ApiTags("public-catalogues")
@Controller("public/catalogues")
@SkipSecurity() // All endpoints in this controller are public
export class CataloguePublicController {
  constructor(private catalogueService: CatalogueService) {}

  @Get(":slug")
  @ApiOperation({ summary: "Get public catalogue metadata" })
  async getCatalogue(@Param("slug") slug: string) {
    return this.catalogueService.getPublicCatalogueBySlug(slug);
  }

  @Post(":slug/unlock")
  @ApiOperation({ summary: "Unlock a password-protected catalogue" })
  async unlock(@Param("slug") slug: string, @Body() dto: UnlockCatalogueDto) {
    return this.catalogueService.unlockCatalogue(slug, dto.password);
  }

  @Get(":slug/items")
  @ApiOperation({
    summary:
      "Get catalogue items (requires unlock token if password-protected)",
  })
  async getItems(
    @Param("slug") slug: string,
    @Headers("x-catalogue-token") token?: string,
  ) {
    return this.catalogueService.getPublicCatalogueItems(slug, token);
  }

  @Post(":slug/view")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Record a catalogue view event" })
  async recordView(@Param("slug") slug: string, @Req() req: Request) {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";
    const userAgent = req.headers["user-agent"];
    const referrer = req.headers["referer"];
    await this.catalogueService.recordView(slug, ip, userAgent, referrer);
    return { success: true };
  }

  // ─── Customer flows (JWT required) ────────────────────────────────

  @Post(":slug/request-quote")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CUSTOMER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Request a quote from catalogue items" })
  async requestQuote(
    @Param("slug") slug: string,
    @CurrentUser("id") userId: string,
    @Body()
    body: {
      items: { inventoryItemId: string; variantId?: string; qty?: number }[];
      notes?: string;
    },
  ) {
    return this.catalogueService.requestQuoteFromCatalogue(
      slug,
      userId,
      body.items,
      body.notes,
    );
  }

  @Post(":slug/message-shop")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("CUSTOMER")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Open a conversation with the shop about this catalogue",
  })
  async messageShop(
    @Param("slug") slug: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.catalogueService.messageShopFromCatalogue(slug, userId);
  }
}
