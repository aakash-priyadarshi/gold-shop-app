import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { Roles } from "../../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { EnterpriseGuard } from "../guards/enterprise.guard";
import { WhiteLabelService } from "../services/white-label.service";

@ApiTags("enterprise/white-label")
@Controller("enterprise/white-label")
@UseGuards(JwtAuthGuard, RolesGuard, EnterpriseGuard)
@ApiBearerAuth()
export class WhiteLabelController {
  constructor(private readonly whiteLabelService: WhiteLabelService) {}

  @Get()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get white-label config" })
  async getConfig(@CurrentUser("activeShopId") shopId: string) {
    return this.whiteLabelService.getConfig(shopId);
  }

  @Patch()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Update white-label branding config" })
  async updateConfig(
    @CurrentUser("activeShopId") shopId: string,
    @Body()
    body: Partial<{
      customDomain: string | null;
      logoUrl: string | null;
      faviconUrl: string | null;
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
      fontFamily: string;
      headerHtml: string | null;
      footerHtml: string | null;
      hideOrivraa: boolean;
      customCss: string | null;
      metaTitle: string | null;
      metaDescription: string | null;
      ogImageUrl: string | null;
      isActive: boolean;
    }>,
  ) {
    return this.whiteLabelService.upsertConfig(shopId, body);
  }
}
