import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Redirect,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, type ApiBodyOptions } from "@nestjs/swagger";
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
  SaveOfferCampaignEmailDesignDto,
  SendRecoveryAudienceDto,
  SendRecoveryOffersDto,
  UpdateOfferCampaignEmailDto,
  UpdateOfferCampaignDto,
} from "./dto/recovery-offer.dto";
import { FestivalCalendarService } from "./festival-calendar.service";
import {
  OFFER_EMAIL_IMAGE_MAX_BYTES,
  RecoveryOffersService,
} from "./recovery-offers.service";

const offerEmailImageUpload = FileInterceptor("image", {
  limits: { fileSize: OFFER_EMAIL_IMAGE_MAX_BYTES, files: 1 },
});

const offerEmailMultipartBody: ApiBodyOptions = {
  schema: {
    type: "object",
    required: ["emailSubject", "emailHeading", "emailBody", "imageMode"],
    properties: {
      emailSubject: { type: "string" },
      emailHeading: { type: "string" },
      emailBody: { type: "string" },
      imageMode: {
        type: "string",
        enum: ["KEEP", "DEFAULT", "URL", "UPLOAD"],
      },
      imageUrl: { type: "string" },
      ctaUrl: { type: "string" },
      ctaLabel: { type: "string" },
      image: { type: "string", format: "binary" },
    },
  },
};

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

  @Patch("admin/campaigns/:key/email")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseInterceptors(offerEmailImageUpload)
  @ApiConsumes("multipart/form-data")
  @ApiBody(offerEmailMultipartBody)
  updateCampaignEmail(
    @Param("key") key: string,
    @Body() dto: UpdateOfferCampaignEmailDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.recoveryOffers.updateCampaignEmail(key, dto, image);
  }

  @Post("admin/campaigns/:key/email/preview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @UseInterceptors(offerEmailImageUpload)
  @ApiConsumes("multipart/form-data")
  @ApiBody(offerEmailMultipartBody)
  previewCampaignEmail(
    @Param("key") key: string,
    @Body() dto: UpdateOfferCampaignEmailDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.recoveryOffers.previewCampaignEmail(key, dto, image);
  }

  @Put("admin/campaigns/:key/email-design")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  updateCampaignEmailDesign(
    @Param("key") key: string,
    @Body() dto: SaveOfferCampaignEmailDesignDto,
  ) {
    return this.recoveryOffers.updateCampaignEmailDesign(key, dto);
  }

  @Post("admin/campaigns/:key/email-design/preview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  previewCampaignEmailDesign(
    @Param("key") key: string,
    @Body() dto: SaveOfferCampaignEmailDesignDto,
  ) {
    return this.recoveryOffers.previewCampaignEmailDesign(key, dto);
  }

  @Delete("admin/campaigns/:key/email-design")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  clearCampaignEmailDesign(@Param("key") key: string) {
    return this.recoveryOffers.clearCampaignEmailDesign(key);
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
