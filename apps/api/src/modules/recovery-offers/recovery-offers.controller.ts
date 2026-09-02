import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  PreviewRecoveryOffersDto,
  PreviewRecoveryAudienceDto,
  RecoveryOfferTokenDto,
  SendRecoveryAudienceDto,
  SendRecoveryOffersDto,
} from "./dto/recovery-offer.dto";
import { RecoveryOffersService } from "./recovery-offers.service";

@Controller("recovery-offers")
export class RecoveryOffersController {
  constructor(private readonly recoveryOffers: RecoveryOffersService) {}

  @Post("admin/preview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  preview(@Body() dto: PreviewRecoveryOffersDto) {
    return this.recoveryOffers.preview(dto.reportIds, dto.campaignKey);
  }

  @Post("admin/audience/preview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  previewAudience(@Body() dto: PreviewRecoveryAudienceDto) {
    return this.recoveryOffers.previewAudience(dto.campaignKey);
  }

  @Post("admin/send")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  send(@Body() dto: SendRecoveryOffersDto, @CurrentUser("id") adminId: string) {
    return this.recoveryOffers.send({
      reportIds: dto.reportIds,
      campaignKey: dto.campaignKey,
      expiresInDays: dto.expiresInDays,
      deliveryTiming: dto.deliveryTiming,
      confirmed: dto.confirmed,
      adminId,
    });
  }

  @Post("admin/audience/send")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  sendAudience(
    @Body() dto: SendRecoveryAudienceDto,
    @CurrentUser("id") adminId: string,
  ) {
    return this.recoveryOffers.sendAudience({
      userIds: dto.userIds,
      campaignKey: dto.campaignKey,
      expiresInDays: dto.expiresInDays,
      deliveryTiming: dto.deliveryTiming,
      confirmed: dto.confirmed,
      adminId,
    });
  }

  @Post("lookup")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  lookup(@Body() dto: RecoveryOfferTokenDto) {
    return this.recoveryOffers.lookup(dto.token);
  }

  @Post("claim")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  claim(@Body() dto: RecoveryOfferTokenDto, @CurrentUser("id") userId: string) {
    return this.recoveryOffers.claim(dto.token, userId);
  }

  @Get("admin/recent")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  recent() {
    return this.recoveryOffers.listRecent();
  }

  @Get("admin/metrics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  metrics(@Query("campaignKey") campaignKey?: string) {
    return this.recoveryOffers.getCampaignMetrics(campaignKey);
  }
}
