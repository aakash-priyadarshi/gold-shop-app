import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { UserRole } from "@prisma/client";
import { Request } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { SkipSecurity } from "../security/security.guard";
import { AiRfqBuilderService } from "./ai-rfq-builder.service";
import {
  AiRfqBuilderDto,
  FeasibilityCheckDto,
  RecordLossReasonDto,
  ReviewAnomalyDto,
} from "./dto/rfq-builder.dto";
import { MarketplaceIntelligenceService } from "./marketplace-intelligence.service";

@ApiTags("marketplace-intelligence")
@Controller("marketplace-intelligence")
export class MarketplaceIntelligenceController {
  private readonly logger = new Logger(MarketplaceIntelligenceController.name);

  constructor(
    private intelligenceService: MarketplaceIntelligenceService,
    private rfqBuilderService: AiRfqBuilderService,
  ) {}

  // ═══════════════════════════════════════
  // AI RFQ BUILDER (Public — rate limited)
  // Guests: 5 requests/hour | Logged-in: 30/hour
  // ═══════════════════════════════════════

  @Post("rfq-builder")
  @SkipSecurity()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 3600000, limit: 30 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "AI-assisted RFQ builder — converts natural language to structured specs (guests allowed with rate limit)",
  })
  async buildRfq(@Body() dto: AiRfqBuilderDto, @Req() req: Request) {
    const user = (req as any).user;
    const isGuest = !user;

    // Stricter rate limit for guests using Redis
    if (isGuest) {
      const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
      const allowed = await this.rfqBuilderService.checkGuestRateLimit(
        String(ip),
      );
      if (!allowed) {
        return {
          jewelleryType: "OTHER",
          buildMethod: "METHOD_B",
          composition: { primary: { material: "GOLD_22K", percentage: 100 } },
          confidence: 0,
          reasoning:
            "You have reached the guest limit (5 AI requests per hour). Please sign in for unlimited access.",
          suggestions: [
            "Create a free account to get unlimited AI assistance",
            "You can still fill the form manually below",
          ],
          guestLimitReached: true,
        };
      }
    }

    const result = await this.rfqBuilderService.buildRfqFromDescription(dto);
    return { ...result, isGuest };
  }

  // ═══════════════════════════════════════
  // BUDGET FEASIBILITY CHECKER (Public)
  // ═══════════════════════════════════════

  @Post("feasibility-check")
  @SkipSecurity()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { ttl: 3600000, limit: 20 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Check if a budget is feasible for requested jewellery specs",
  })
  async checkFeasibility(@Body() dto: FeasibilityCheckDto) {
    return this.rfqBuilderService.checkFeasibility(dto);
  }

  // ═══════════════════════════════════════
  // AI TOOLTIPS
  // ═══════════════════════════════════════

  @Get("tooltips")
  @SkipSecurity()
  @ApiOperation({ summary: "Get AI-generated tooltips for UI elements" })
  async getTooltips(@Query("category") category?: string) {
    return this.rfqBuilderService.getTooltips(category);
  }

  // ═══════════════════════════════════════
  // OFFER COMPARISON (Customer)
  // ═══════════════════════════════════════

  @Get("offers/compare/:rfqId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get normalized offer comparison for an RFQ" })
  async compareOffers(@Param("rfqId") rfqId: string) {
    return this.intelligenceService.getOfferComparison(rfqId);
  }

  // ═══════════════════════════════════════
  // ORDER PROTECTION TIMELINE (Customer)
  // ═══════════════════════════════════════

  @Get("order-protection/:orderId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get order protection timeline for customer trust" })
  async getOrderProtection(@Param("orderId") orderId: string) {
    return this.intelligenceService.getOrderProtectionTimeline(orderId);
  }

  // ═══════════════════════════════════════
  // TRUST PROFILES (Public)
  // ═══════════════════════════════════════

  @Get("trust-profile/:shopId")
  @SkipSecurity()
  @ApiOperation({ summary: "Get trust-first shop profile data" })
  async getTrustProfile(@Param("shopId") shopId: string) {
    return this.intelligenceService.getTrustProfile(shopId);
  }

  // ═══════════════════════════════════════
  // COUNTER-OFFER PLAYBOOKS (Customer)
  // ═══════════════════════════════════════

  @Get("counter-offer-suggestions/:offerId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get data-driven counter-offer suggestions" })
  async getCounterOfferSuggestions(@Param("offerId") offerId: string) {
    return this.intelligenceService.getCounterOfferSuggestions(offerId);
  }

  // ═══════════════════════════════════════
  // WIN/LOSS REASONS (Customer)
  // ═══════════════════════════════════════

  @Post("loss-reason")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Record why an offer was not selected" })
  async recordLossReason(@Body() dto: RecordLossReasonDto) {
    await this.intelligenceService.recordLossReason(
      dto.offerId,
      dto.category,
      dto.note,
    );
    return { success: true };
  }

  // ═══════════════════════════════════════
  // ADMIN: INTELLIGENCE DASHBOARD
  // ═══════════════════════════════════════

  @Get("admin/dashboard")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get marketplace intelligence dashboard" })
  async getDashboard() {
    return this.intelligenceService.getDashboard();
  }

  @Get("admin/ai-capabilities")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current AI capabilities based on data" })
  async getAiCapabilities() {
    return this.intelligenceService.getAiCapabilities();
  }

  // ═══════════════════════════════════════
  // ADMIN: AI PHASE MILESTONES
  // ═══════════════════════════════════════

  @Get("admin/milestones")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all AI phase milestones with progress" })
  async getMilestones() {
    return this.intelligenceService.getMilestones();
  }

  @Patch("admin/milestones/:id/action")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a milestone action item status" })
  async updateMilestoneAction(
    @Param("id") id: string,
    @Body()
    body: { actionIndex: number; status: "pending" | "completed" | "skipped" },
  ) {
    return this.intelligenceService.updateMilestoneAction(
      id,
      body.actionIndex,
      body.status,
    );
  }

  // ═══════════════════════════════════════
  // ADMIN: QUOTE ANOMALIES
  // ═══════════════════════════════════════

  @Get("admin/anomalies")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get quote anomalies for review" })
  async getAnomalies(
    @Query("type") type?: string,
    @Query("severity") severity?: string,
    @Query("reviewed") reviewed?: string,
    @Query("limit") limit?: string,
  ) {
    return this.intelligenceService.getAnomalies({
      type,
      severity,
      reviewed:
        reviewed === "true" ? true : reviewed === "false" ? false : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Patch("admin/anomalies/:id/review")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mark a quote anomaly as reviewed" })
  async reviewAnomaly(
    @Param("id") id: string,
    @CurrentUser("id") adminId: string,
    @Body() body: ReviewAnomalyDto,
  ) {
    return this.intelligenceService.reviewAnomaly(id, adminId, body.note);
  }
}
