import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { SellerEngagementService } from "./seller-engagement.service";
import { SellerPerformanceService } from "./seller-performance.service";

@ApiTags("seller-performance")
@Controller("seller-performance")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SellerPerformanceController {
  constructor(
    private performanceService: SellerPerformanceService,
    private engagementService: SellerEngagementService,
  ) {}

  @Get("my-dashboard")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({
    summary: "Get seller performance dashboard for current shop",
  })
  async getMyDashboard(
    @CurrentUser("shopId") shopId: string,
    @Query("targetTier") targetTier?: string,
  ) {
    return this.performanceService.getDashboard(shopId, targetTier);
  }

  /* ─── HEALTH SCORE ─── */

  @Get("health-score")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get health score for current shop" })
  async getMyHealthScore(@CurrentUser("shopId") shopId: string) {
    return this.engagementService.calculateHealthScore(shopId);
  }

  /* ─── ONBOARDING ─── */

  @Get("onboarding")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get onboarding progress for current shop" })
  async getMyOnboarding(@CurrentUser("shopId") shopId: string) {
    return this.engagementService.getOnboardingProgress(shopId);
  }

  /* ─── MILESTONES ─── */

  @Get("milestones")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get milestones & achievements for current shop" })
  async getMyMilestones(@CurrentUser("shopId") shopId: string) {
    return this.engagementService.getMilestones(shopId);
  }

  /* ─── RFQ FUNNEL ─── */

  @Get("rfq-funnel")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get RFQ conversion funnel for current shop" })
  async getMyRfqFunnel(
    @CurrentUser("shopId") shopId: string,
    @Query("days") days?: string,
  ) {
    return this.engagementService.getRfqFunnel(
      shopId,
      days ? parseInt(days) : 90,
    );
  }

  /* ─── ADMIN: SHOP PERFORMANCE BY ID (must be LAST — :shopId is a catch-all) ─── */

  @Get(":shopId")
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Get seller performance for a specific shop (admin)",
  })
  async getShopPerformance(
    @Param("shopId") shopId: string,
    @Query("targetTier") targetTier?: string,
  ) {
    return this.performanceService.getDashboard(shopId, targetTier);
  }

  @Post("recalculate/:shopId")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Force recalculate performance for a shop (admin)" })
  async recalculate(@Param("shopId") shopId: string) {
    const result = await this.performanceService.recalculateForShop(shopId);
    return { message: "Performance recalculated", data: result };
  }

  @Post("recalculate-all")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Force recalculate all seller performance (admin)" })
  async recalculateAll() {
    await this.performanceService.recalculateAll();
    return { message: "All seller performance recalculated" };
  }

  /* ─── PLATFORM REVIEWS (Seller) ─── */

  @Get("reviews")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get my platform review submissions" })
  async getMyReviews(@CurrentUser("shopId") shopId: string) {
    return this.engagementService.getShopPlatformReviews(shopId);
  }

  @Post("reviews")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Submit a platform review proof" })
  async submitReview(
    @CurrentUser("shopId") shopId: string,
    @Body() body: { platform: string; proofScreenshot: string; reviewUrl?: string },
  ) {
    return this.engagementService.submitPlatformReview(
      shopId,
      body.platform,
      body.proofScreenshot,
      body.reviewUrl,
    );
  }

  /* ─── PLATFORM REVIEWS (Admin) ─── */

  @Get("admin/reviews")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "List all platform review submissions (admin)" })
  async listAllReviews(@Query("status") status?: string) {
    return this.engagementService.listPendingReviews(status);
  }

  @Post("admin/reviews/:reviewId/:action")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Approve or reject a platform review (admin)" })
  async processReview(
    @Param("reviewId") reviewId: string,
    @Param("action") action: "approve" | "reject",
    @CurrentUser("id") adminId: string,
    @Body() body: { adminNotes?: string },
  ) {
    return this.engagementService.reviewPlatformSubmission(
      reviewId,
      adminId,
      action,
      body.adminNotes,
    );
  }

  @Post("admin/reviews/send-reminders")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Send review reminders to eligible shops (admin)" })
  async sendReminders() {
    return this.engagementService.sendReviewReminders();
  }

  /* ─── REFERRAL PROGRAMME (Seller) ─── */

  @Get("referrals")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Get my referral invitations" })
  async getMyReferrals(@CurrentUser("shopId") shopId: string) {
    return this.engagementService.getMyReferrals(shopId);
  }

  @Post("referrals")
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: "Create a referral invitation" })
  async createReferral(
    @CurrentUser("shopId") shopId: string,
    @Body() body: { refereeEmail: string; rewardType: string },
  ) {
    return this.engagementService.createReferral(
      shopId,
      body.refereeEmail,
      body.rewardType as any,
    );
  }

  /* ─── REFERRAL PROGRAMME (Admin) ─── */

  @Get("admin/referrals")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "List all referrals (admin)" })
  async listReferrals(@Query("status") status?: string) {
    return this.engagementService.listReferrals(status);
  }

  @Post("admin/referrals/:referralId/complete")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Complete a referral and grant rewards (admin)" })
  async completeReferral(@Param("referralId") referralId: string) {
    return this.engagementService.completeReferral(referralId);
  }

  @Get("admin/referral-settings")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get referral programme settings (admin)" })
  async getReferralSettings() {
    return this.engagementService.getReferralSettingsAdmin();
  }

  @Post("admin/referral-settings")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update referral programme settings (admin)" })
  async updateReferralSettings(
    @Body()
    body: {
      proMonths?: number;
      proPlusMonths?: number;
      expirationDays?: number;
      maxReferralsPerShop?: number;
      isActive?: boolean;
    },
  ) {
    return this.engagementService.updateReferralSettings(body);
  }

  @Post("admin/referrals/expire-old")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Expire old pending referrals (admin)" })
  async expireOldReferrals() {
    return this.engagementService.expireOldReferrals();
  }
}
