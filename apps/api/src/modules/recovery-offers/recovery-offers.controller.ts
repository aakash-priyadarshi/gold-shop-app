import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
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
  RecoveryOfferTokenDto,
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
}
