import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
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
  // ═══════════════════════════════════════

  @Post("rfq-builder")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "AI-assisted RFQ builder — converts natural language to structured specs",
  })
  async buildRfq(@Body() dto: AiRfqBuilderDto) {
    return this.rfqBuilderService.buildRfqFromDescription(dto);
  }

  // ═══════════════════════════════════════
  // BUDGET FEASIBILITY CHECKER
  // ═══════════════════════════════════════

  @Post("feasibility-check")
  @UseGuards(JwtAuthGuard)
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
