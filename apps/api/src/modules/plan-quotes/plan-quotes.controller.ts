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
import { Throttle } from "@nestjs/throttler";
import {
  CreatePlanInquiryDto,
  CreatePlanQuoteDto,
  RevokePlanQuoteDto,
  UpdatePlanInquiryDto,
} from "./dto/plan-quote.dto";
import { PlanQuotesService } from "./plan-quotes.service";

@ApiTags("plan-quotes")
@Controller("plan-quotes")
export class PlanQuotesController {
  constructor(private readonly planQuotes: PlanQuotesService) {}

  @Post("inquiry")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Ask sales about a plan (Pro+/Enterprise)" })
  createInquiry(
    @Body() dto: CreatePlanInquiryDto,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") shopId: string,
  ) {
    return this.planQuotes.createInquiry(dto, userId, shopId);
  }

  @Get("quotes/:token")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Resolve a quote link for the billing page" })
  getQuote(
    @Param("token") token: string,
    @CurrentUser("id") userId: string,
    @CurrentUser("shopId") shopId: string,
  ) {
    return this.planQuotes.getQuoteForShop(token, userId, shopId);
  }

  // ─── Admin ────────────────────────────────────────

  @Get("admin/inquiries")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List plan inquiries" })
  listInquiries() {
    return this.planQuotes.listInquiries();
  }

  @Patch("admin/inquiries/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update plan inquiry status" })
  updateInquiry(
    @Param("id") id: string,
    @Body() dto: UpdatePlanInquiryDto,
  ) {
    return this.planQuotes.updateInquiryStatus(id, dto.status);
  }

  @Post("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a custom-priced quote and email the shop" })
  createQuote(
    @Body() dto: CreatePlanQuoteDto,
    @CurrentUser("id") adminId: string,
  ) {
    return this.planQuotes.createQuote(dto, adminId);
  }

  @Get("admin/quotes")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List sent quotes" })
  listQuotes() {
    return this.planQuotes.listQuotes();
  }

  @Patch("admin/quotes/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke an unredeemed quote" })
  revokeQuote(@Param("id") id: string, @Body() _dto: RevokePlanQuoteDto) {
    return this.planQuotes.revokeQuote(id);
  }
}
