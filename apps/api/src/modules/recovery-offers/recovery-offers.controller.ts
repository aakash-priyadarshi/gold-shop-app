import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Redirect,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
  CreateOfferCampaignDto,
  FestivalCalendarQueryDto,
  PreviewRecoveryOffersDto,
  PreviewRecoveryAudienceDto,
  RecoveryOfferTokenDto,
  SendRecoveryAudienceDto,
  SendRecoveryOffersDto,
  UpdateOfferCampaignDto,
} from "./dto/recovery-offer.dto";
import { FestivalCalendarService } from "./festival-calendar.service";
import { RecoveryOffersService } from "./recovery-offers.service";

function asSingleQueryValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

@Controller("recovery-offers")
export class RecoveryOffersController {
  constructor(
    private readonly recoveryOffers: RecoveryOffersService,
    private readonly festivalCalendar: FestivalCalendarService,
  ) {}

  @Get("admin/festivals")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  festivals(@Query() query: FestivalCalendarQueryDto) {
    return this.festivalCalendar.getCalendar(
      query.startYear ?? new Date().getUTCFullYear(),
      query.years ?? 3,
    );
  }

  @Get("admin/campaigns")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  listCampaigns() {
    return this.recoveryOffers.listCampaigns();
  }

  @Post("admin/campaigns")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createCampaign(
    @Body() dto: CreateOfferCampaignDto,
    @CurrentUser("id") adminId: string,
  ) {
    return this.recoveryOffers.createCampaign(dto, adminId);
  }

  @Patch("admin/campaigns/:key")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateCampaign(
    @Param("key") key: string,
    @Body() dto: UpdateOfferCampaignDto,
  ) {
    return this.recoveryOffers.updateCampaign(key, dto);
  }

  @Get("campaigns/:key")
  getCampaign(@Param("key") key: string) {
    return this.recoveryOffers.getPublicCampaign(key);
  }

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
      scheduledFor: dto.scheduledFor,
      recipientSchedules: dto.recipientSchedules,
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

  @Get("unsubscribe")
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Redirect()
  unsubscribeLanding(@Query("token") token?: unknown) {
    return {
      url: this.recoveryOffers.unsubscribePageUrl(
        asSingleQueryValue(token) || "",
      ),
      statusCode: 302,
    };
  }

  @Post("unsubscribe")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  unsubscribe(
    @Query("token") queryToken?: unknown,
    @Body() body?: { token?: unknown },
  ) {
    return this.recoveryOffers.unsubscribe(
      asSingleQueryValue(queryToken) || asSingleQueryValue(body?.token),
    );
  }
}
