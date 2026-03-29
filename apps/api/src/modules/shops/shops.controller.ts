import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ContentModerationService } from "./content-moderation.service";
import { CreateShopDto } from "./dto/create-shop.dto";
import { OAuthShopSetupDto } from "./dto/oauth-shop-setup.dto";
import { UpdateMetalRatesDto } from "./dto/update-metal-rates.dto";
import { UpdateShopDto } from "./dto/update-shop.dto";
import { ShopsService } from "./shops.service";
import { SkipSecurity } from "../security/security.guard";
import { CacheTTL } from '../../common';

@ApiTags("shops")
@Controller("shops")
export class ShopsController {
  constructor(
    private shopsService: ShopsService,
    private moderationService: ContentModerationService,
  ) {}

  // Public endpoint for verified shops listing (for /shops page)
  @Get("public")
  @SkipSecurity()
  @CacheTTL(120) // Cache public shops listing for 2 minutes
  @ApiOperation({ summary: "List all verified public shops" })
  async findPublicShops(
    @Query("country") country?: string,
    @Query("state") state?: string,
    @Query("city") city?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.shopsService.findAll({
      country,
      city,
      verified: true, // Only verified shops
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 50,
    });
  }

  // Debug endpoint to check why matching isn't finding sellers — admin only
  @Get("matching-debug")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Debug matching: show all shops and why each matches or not",
  })
  async debugMatching(
    @Query("jewelleryType") jewelleryType: string,
    @Query("buildMethod") buildMethod: string,
    @Query("metalType") metalType?: string,
    @Query("customerCountry") customerCountry?: string,
  ) {
    return this.shopsService.debugMatching({
      jewelleryType: jewelleryType || "RING",
      buildMethod: buildMethod || "METHOD_A",
      metalType,
      customerCountry,
    });
  }

  // Public endpoint for finding matching sellers for an RFQ
  @Get("matching")
  @SkipSecurity()
  @ApiOperation({ summary: "Find matching sellers for an RFQ with pricing" })
  async findMatchingSellers(
    @Query("jewelleryType") jewelleryType: string,
    @Query("buildMethod") buildMethod: string,
    @Query("metalType") metalType?: string,
    @Query("alloyType") alloyType?: string,
    @Query("baseMetal") baseMetal?: string,
    @Query("platingType") platingType?: string,
    @Query("surfaceFinish") surfaceFinish?: string,
    @Query("estimatedWeight") estimatedWeight?: string,
    @Query("customerCity") customerCity?: string,
    @Query("customerState") customerState?: string,
    @Query("customerCountry") customerCountry?: string,
    @Query("minRating") minRating?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("sortBy") sortBy?: "price" | "rating" | "location" | "popularity",
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("includeInternational") includeInternational?: string,
    @Query("gemstoneCost") gemstoneCost?: string,
    @Query("gemstones") gemstones?: string,
    @Query("gemstoneCostFallback") gemstoneCostFallback?: string,
  ) {
    // Parse gemstone specs JSON from query param
    let parsedGemstones: Array<{
      stoneType: string;
      sizeValue: string;
      sizeUnit: string;
      count: number;
      qualityTier: string;
      settingStyle?: string;
    }> = [];
    if (gemstones) {
      try {
        parsedGemstones = JSON.parse(gemstones);
      } catch {
        // Ignore malformed JSON
      }
    }

    return this.shopsService.findMatchingSellers({
      jewelleryType,
      buildMethod,
      metalType,
      alloyType,
      baseMetal,
      platingType,
      surfaceFinish,
      estimatedWeight: estimatedWeight ? parseFloat(estimatedWeight) : 5,
      customerCity,
      customerState,
      customerCountry,
      minRating: minRating ? parseFloat(minRating) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      includeInternational: includeInternational === "true",
      gemstoneCost: gemstoneCost ? parseFloat(gemstoneCost) : 0,
      gemstones: parsedGemstones.length > 0 ? parsedGemstones : undefined,
      gemstoneCostFallback: gemstoneCostFallback
        ? parseFloat(gemstoneCostFallback)
        : 0,
    });
  }

  @Get()
  @SkipSecurity()
  @ApiOperation({ summary: "List all shops" })
  async findAll(
    @Query("country") country?: string,
    @Query("city") city?: string,
    @Query("jewelleryType") jewelleryType?: string,
    @Query("method") method?: string,
    @Query("verified") verified?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.shopsService.findAll({
      country,
      city,
      jewelleryType,
      method,
      verified: verified !== undefined ? verified === "true" : undefined,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  @Get("my-shop")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user shop" })
  async getMyShop(@CurrentUser("id") userId: string) {
    return this.shopsService.findByUserId(userId);
  }

  @Get("my-shops")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all shops owned by current user" })
  async getMyShops(@CurrentUser("id") userId: string) {
    return this.shopsService.findAllByUserId(userId);
  }

  @Get("my-shop/dashboard")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get shop dashboard" })
  async getDashboard(@CurrentUser("shopId") shopId: string) {
    return this.shopsService.getShopDashboard(shopId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new shop" })
  async create(@CurrentUser("id") userId: string, @Body() dto: CreateShopDto) {
    return this.shopsService.create(userId, dto);
  }

  @Post("setup")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Complete shop setup for OAuth SHOPKEEPER users" })
  async setupShop(
    @CurrentUser("id") userId: string,
    @Body() dto: OAuthShopSetupDto,
  ) {
    // This endpoint allows shopkeepers who signed up via Google OAuth to create their shop
    // Also validates and saves the user's phone number (must be unique)
    return this.shopsService.setupShopForOAuthUser(userId, dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // MY SHOP ENDPOINTS (for authenticated shopkeeper)
  // ═══════════════════════════════════════════════════════════════

  @Get("my-shop/settings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get shop settings" })
  async getMyShopSettings(@CurrentUser("id") userId: string) {
    return this.shopsService.getShopSettings(userId);
  }

  @Patch("my-shop/settings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update shop settings" })
  async updateMyShopSettings(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateShopDto,
  ) {
    return this.shopsService.updateShopSettings(userId, dto);
  }

  @Get("my-shop/analytics")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get shop analytics" })
  async getMyShopAnalytics(
    @CurrentUser("shopId") shopId: string,
    @Query("period") period?: string,
  ) {
    return this.shopsService.getShopAnalytics(shopId, period);
  }

  @Get("my-shop/materials")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get shop materials inventory" })
  async getMyShopMaterials(@CurrentUser("shopId") shopId: string) {
    return this.shopsService.getShopMaterials(shopId);
  }

  @Put("my-shop/materials")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update shop materials inventory" })
  async updateMyShopMaterials(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body()
    dto: {
      materials: Array<{
        materialCode: string;
        isAvailable: boolean;
        pricePerGramNpr?: number;
      }>;
    },
  ) {
    return this.shopsService.updateShopMaterials(shopId, userId, dto.materials);
  }

  @Get("my-shop/capabilities")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get shop capabilities (jewellery types)" })
  async getMyShopCapabilities(@CurrentUser("shopId") shopId: string) {
    return this.shopsService.getShopCapabilities(shopId);
  }

  @Put("my-shop/capabilities")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update shop capabilities" })
  async updateMyShopCapabilities(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body()
    dto: {
      jewelleryTypes?: string[];
      buildMethods?: string[];
      finishes?: string[];
      gemstones?: string[];
      alloys?: string[];
      baseMetals?: string[];
      platingTypes?: string[];
    },
  ) {
    return this.shopsService.updateShopCapabilities(shopId, userId, dto);
  }

  @Get("my-shop/gemstone-pricing")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get shop gemstone pricing (overrides + system defaults)",
  })
  async getMyShopGemstonePricing(@CurrentUser("shopId") shopId: string) {
    return this.shopsService.getShopGemstonePricing(shopId);
  }

  @Put("my-shop/gemstone-pricing")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update shop gemstone pricing" })
  async updateMyShopGemstonePricing(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body()
    dto: {
      rates: Array<{
        stoneType: string;
        origin: string;
        sizeCategory: string;
        qualityTier: string;
        pricePerStone: number;
      }>;
    },
  ) {
    return this.shopsService.updateShopGemstonePricing(
      shopId,
      userId,
      dto.rates,
    );
  }

  @Get("my-shop/component-pricing")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Get shop component pricing (base metals, plating, finishes overrides)",
  })
  async getMyShopComponentPricing(@CurrentUser("shopId") shopId: string) {
    return this.shopsService.getShopComponentPricing(shopId);
  }

  @Put("my-shop/component-pricing")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update shop component pricing" })
  async updateMyShopComponentPricing(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("id") userId: string,
    @Body()
    dto: {
      baseMetalPrices?: Record<string, number>;
      platingPrices?: Record<string, number>;
      finishPrices?: Record<string, number>;
    },
  ) {
    return this.shopsService.updateShopComponentPricing(shopId, userId, dto);
  }

  // ── KYC & Verification Endpoints ────────────────────
  // NOTE: These must be above @Get(":id") to avoid route shadowing

  @Get("my-shop/kyc")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get KYC/verification documents for current shop" })
  async getMyShopKyc(@CurrentUser("id") userId: string) {
    return this.shopsService.getShopKyc(userId);
  }

  @Patch("my-shop/kyc")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update KYC/verification documents" })
  async updateMyShopKyc(
    @CurrentUser("id") userId: string,
    @Body()
    body: {
      panNumber?: string;
      vatNumber?: string;
      bisLicenseNumber?: string;
      verificationDocuments?: Record<string, any>;
    },
  ) {
    return this.shopsService.updateShopKyc(userId, body);
  }

  @Post("my-shop/kyc/remind-admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Remind admin to review shop verification" })
  async remindAdminKyc(@CurrentUser("id") userId: string) {
    return this.shopsService.remindAdminKyc(userId);
  }

  // ── Shop Profile Endpoints ──────────────────────────

  @Patch("my-shop/profile")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update shop profile (about, images)" })
  async updateShopProfile(
    @CurrentUser("id") userId: string,
    @Body()
    body: {
      about?: string;
      profileImage?: string;
      coverImage?: string;
      shopName?: string;
    },
  ) {
    return this.shopsService.updateShopProfile(userId, body);
  }

  @Post("my-shop/moderate-about")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check about text for policy violations (live)" })
  async moderateAbout(@Body() body: { text: string }) {
    return this.moderationService.moderateAboutText(body.text);
  }

  // ── Review Management Endpoints ─────────────────────

  @Get("my-shop/reviews")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all reviews for current shop" })
  async getMyReviews(
    @CurrentUser("shopId") shopId: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.shopsService.getShopReviews(shopId, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  @Patch("my-shop/reviews/:reviewId/reply")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reply to a customer review" })
  async replyToReview(
    @CurrentUser("shopId") shopId: string,
    @Param("reviewId") reviewId: string,
    @Body() body: { reply: string },
  ) {
    return this.shopsService.replyToReview(shopId, reviewId, body.reply);
  }

  @Post("my-shop/reviews/:reviewId/request-delete")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Request admin to delete a review" })
  async requestReviewDeletion(
    @CurrentUser("shopId") shopId: string,
    @Param("reviewId") reviewId: string,
    @Body() body: { reason: string },
  ) {
    return this.shopsService.requestReviewDeletion(
      shopId,
      reviewId,
      body.reason,
    );
  }

  // Admin endpoint to handle review deletion requests
  @Patch("admin/reviews/:reviewId/handle-delete")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Approve or reject review deletion request (Admin)",
  })
  async handleReviewDeletion(
    @Param("reviewId") reviewId: string,
    @CurrentUser("id") adminId: string,
    @Body() body: { action: "APPROVED" | "REJECTED" },
  ) {
    return this.shopsService.handleReviewDeletionRequest(
      reviewId,
      adminId,
      body.action,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS (parameterized routes must be LAST)
  // ═══════════════════════════════════════════════════════════════

  @Get(":id")
  @ApiOperation({ summary: "Get shop by ID" })
  async findOne(@Param("id") id: string) {
    return this.shopsService.findById(id);
  }

  @Get(":id/component-pricing")
  @ApiOperation({
    summary:
      "Get shop component pricing (public — base metals, plating, finishes)",
  })
  async getShopComponentPricingPublic(@Param("id") id: string) {
    return this.shopsService.getShopComponentPricing(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update shop details" })
  async update(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateShopDto,
  ) {
    return this.shopsService.update(id, userId, dto);
  }

  @Patch(":id/metal-rates")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update shop metal rates" })
  async updateMetalRates(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateMetalRatesDto,
  ) {
    return this.shopsService.updateMetalRates(id, userId, dto);
  }

  @Patch(":id/verify")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verify a shop (Admin only)" })
  async verify(@Param("id") id: string, @CurrentUser("id") adminId: string) {
    return this.shopsService.verifyShop(id, adminId);
  }

  @Get(":id/kyc")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get KYC/verification documents for a shop (Admin)",
  })
  async getShopKycAdmin(@Param("id") id: string) {
    return this.shopsService.getShopKycByShopId(id);
  }

  @Patch(":id/kyc-status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Approve or reject shop KYC verification (Admin)" })
  async updateShopKycStatus(
    @Param("id") id: string,
    @CurrentUser("id") adminId: string,
    @Body() body: { action: "approve" | "reject"; reason?: string },
  ) {
    return this.shopsService.updateShopKycStatus(
      id,
      adminId,
      body.action,
      body.reason,
    );
  }

  @Patch(":id/admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update shop details (Admin only)" })
  async adminUpdateShop(
    @Param("id") id: string,
    @CurrentUser("id") adminId: string,
    @Body() dto: UpdateShopDto,
  ) {
    return this.shopsService.adminUpdateShop(id, adminId, dto);
  }

  @Delete(":id/admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a shop (Admin only)" })
  async adminDeleteShop(
    @Param("id") id: string,
    @CurrentUser("id") adminId: string,
  ) {
    return this.shopsService.adminDeleteShop(id, adminId);
  }
}
