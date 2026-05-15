import {
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    HttpStatus,
    Logger,
    Param,
    Patch,
    Post,
    Query,
    Request,
    UseGuards,
} from "@nestjs/common";
import { BuildMethod, JewelleryType, WeightCategory } from "@prisma/client";
import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import { Request as ExpressRequest } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { FeatureGateGuard } from "../subscriptions/feature-gate.guard";
import { RequireFeature } from "../subscriptions/require-feature.decorator";
import { DescriptionGeneratorService } from "./description-generator.service";
import { DesignVariationsService } from "./design-variations.service";
import { DesignsService } from "./designs.service";

interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

class AlloyDetailsDto {
  @IsOptional()
  @IsString()
  baseMetal?: string;

  @IsOptional()
  @IsString()
  karat?: string;

  @IsOptional()
  @IsString()
  alloyFamily?: string;

  @IsOptional()
  @IsString()
  recipePresetId?: string;
}

class PlatingDetailsDto {
  @IsOptional()
  @IsString()
  baseMetal?: string;

  @IsOptional()
  @IsString()
  platingType?: string;

  @IsOptional()
  @IsString()
  platingTier?: string;
}

class ItalianMachineDetailsDto {
  @IsOptional()
  @IsString()
  purity?: string;

  @IsOptional()
  @IsString()
  chainStyle?: string;
}

class GemstoneDto {
  @IsOptional()
  @IsString()
  stoneType?: string;

  @IsOptional()
  @IsString()
  shape?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  clarity?: string;

  @IsOptional()
  @IsString()
  cut?: string;

  @IsOptional()
  @IsString()
  settingStyle?: string;

  @IsOptional()
  @IsNumber()
  count?: number;

  @IsOptional()
  @IsNumber()
  sizeValue?: number;

  @IsOptional()
  @IsString()
  sizeUnit?: string;
}

class CreateDesignDto {
  @IsEnum(JewelleryType)
  jewelryType: JewelleryType;

  @IsEnum(BuildMethod)
  buildMethod: BuildMethod;

  @IsOptional()
  @IsString()
  metalType?: string;

  @IsOptional()
  @IsString()
  metalColor?: string;

  @IsOptional()
  @IsString()
  metalDescription?: string;

  @IsOptional()
  @IsEnum(WeightCategory)
  weightCategory?: WeightCategory;

  @IsOptional()
  @IsNumber()
  estimatedWeight?: number;

  @IsOptional()
  @IsString()
  surfaceFinish?: string;

  @IsOptional()
  @IsBoolean()
  hasGemstones?: boolean;

  @IsOptional()
  @IsString()
  primaryStone?: string;

  @IsOptional()
  @IsString()
  stoneCut?: string;

  @IsOptional()
  @IsNumber()
  stoneCarat?: number;

  @IsOptional()
  @IsString()
  stoneColor?: string;

  @IsOptional()
  @IsString()
  stoneClarity?: string;

  @IsOptional()
  @IsString()
  stoneCutGrade?: string;

  @IsOptional()
  @IsNumber()
  stoneCount?: number;

  @IsOptional()
  @IsString()
  settingStyle?: string;

  @IsOptional()
  @IsObject()
  additionalSpecs?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  referenceImageUrl?: string;

  @IsOptional()
  @IsBoolean()
  shareToGallery?: boolean;

  @IsOptional()
  @IsString()
  creatorName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AlloyDetailsDto)
  alloyDetails?: AlloyDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlatingDetailsDto)
  platingDetails?: PlatingDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ItalianMachineDetailsDto)
  italianMachineDetails?: ItalianMachineDetailsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GemstoneDto)
  gemstones?: GemstoneDto[];
}

class UpdateVisibilityDto {
  @IsBoolean()
  isPublic: boolean;
}

class GenerateVariationsDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsNumber()
  budgetMin?: number;

  @IsOptional()
  @IsNumber()
  budgetMax?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  jewelryType?: string;

  @IsOptional()
  @IsString()
  occasion?: string;

  @IsOptional()
  @IsString()
  marketRegion?: string;
}

@Controller("designs")
export class DesignsController {
  private readonly logger = new Logger(DesignsController.name);

  constructor(
    private readonly designsService: DesignsService,
    private readonly descriptionGenService: DescriptionGeneratorService,
    private readonly designVariationsService: DesignVariationsService,
  ) {}

  /**
   * Create a new design with AI-generated image
   * Requires authentication
   */
  @Post()
  @UseGuards(JwtAuthGuard, FeatureGateGuard)
  @RequireFeature("aiDesignGeneration")
  async createDesign(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateDesignDto,
  ) {
    try {
      this.logger.log(`Creating design for user ${req.user!.id}`);
      this.logger.debug(`Design DTO: ${JSON.stringify(dto)}`);
      const result = await this.designsService.createDesign(req.user!.id, dto);
      this.logger.log(`Design created successfully: ${result.design?.id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create design: ${error.message}`,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || "Failed to generate design",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate 5 AI design variations from a natural-language prompt + budget.
   * Pro+ plan feature — gated by `aiDesignVariations`.
   */
  @Post("variations")
  @UseGuards(JwtAuthGuard, FeatureGateGuard)
  @RequireFeature("aiDesignVariations")
  async generateVariations(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GenerateVariationsDto,
  ) {
    try {
      this.logger.log(
        `Generating design variations for user ${req.user!.id}: "${dto.prompt.slice(0, 80)}"`,
      );
      const result = await this.designVariationsService.generateVariations(
        req.user!.id,
        dto,
      );
      this.logger.log(
        `Generated ${result.variations.length} variations (cached=${result.cached})`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Variations generation failed: ${error.message}`,
        error.stack,
      );
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || "Failed to generate design variations",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get designs for the public gallery
   * Authentication optional (for checking if user liked)
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getDesigns(
    @Query("jewelryType") jewelryType?: JewelleryType,
    @Query("buildMethod") buildMethod?: BuildMethod,
    @Query("metalType") metalType?: string,
    @Query("primaryStone") primaryStone?: string,
    @Query("hasGemstones") hasGemstones?: string,
    @Query("featured") featured?: string,
    @Query("sort")
    sort?: "popular" | "liked" | "trending" | "newest" | "most_made",
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.designsService.getDesigns(
      {
        jewelryType,
        buildMethod,
        metalType,
        primaryStone,
        hasGemstones:
          hasGemstones === "true"
            ? true
            : hasGemstones === "false"
              ? false
              : undefined,
        isFeatured: featured === "true",
      },
      sort || "popular",
      parseInt(page || "1", 10),
      parseInt(limit || "20", 10),
    );
  }

  /**
   * Get featured designs for homepage
   */
  @Get("featured")
  async getFeaturedDesigns(@Query("limit") limit?: string) {
    return this.designsService.getFeaturedDesigns(parseInt(limit || "8", 10));
  }

  /**
   * Get similar designs based on characteristics
   * Returns designs that match at least 80% of characteristics
   */
  @Get("similar")
  async getSimilarDesigns(
    @Query("jewelryType") jewelryType: JewelleryType,
    @Query("buildMethod") buildMethod?: BuildMethod,
    @Query("metalType") metalType?: string,
    @Query("hasGemstones") hasGemstones?: string,
    @Query("primaryStone") primaryStone?: string,
    @Query("surfaceFinish") surfaceFinish?: string,
    @Query("limit") limit?: string,
  ) {
    return this.designsService.getSimilarDesigns(
      {
        jewelryType,
        buildMethod,
        metalType,
        hasGemstones:
          hasGemstones === "true"
            ? true
            : hasGemstones === "false"
              ? false
              : undefined,
        primaryStone,
        surfaceFinish,
      },
      parseInt(limit || "6", 10),
    );
  }

  /**
   * Get current user's designs
   */
  @Get("my")
  @UseGuards(JwtAuthGuard)
  async getMyDesigns(
    @Request() req: AuthenticatedRequest,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.designsService.getMyDesigns(
      req.user!.id,
      parseInt(page || "1", 10),
      parseInt(limit || "20", 10),
    );
  }

  /**
   * Get design stats (admin)
   */
  @Get("stats")
  @UseGuards(JwtAuthGuard)
  async getDesignStats() {
    return this.designsService.getDesignStats();
  }

  /**
   * Get a single design by ID
   */
  @Get(":id")
  @UseGuards(OptionalJwtAuthGuard)
  async getDesignById(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.designsService.getDesignById(id, req.user?.id);
  }

  /**
   * Like a design
   */
  @Post(":id/like")
  @UseGuards(JwtAuthGuard)
  async likeDesign(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.designsService.likeDesign(id, req.user!.id);
  }

  /**
   * Unlike a design
   */
  @Delete(":id/like")
  @UseGuards(JwtAuthGuard)
  async unlikeDesign(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.designsService.unlikeDesign(id, req.user!.id);
  }

  /**
   * Track "Build me this" click and return specs for RFQ prefill
   */
  @Post(":id/build")
  @UseGuards(OptionalJwtAuthGuard)
  async buildFromDesign(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    // Increment the orders count
    await this.designsService.incrementOrdersCount(id);

    // Get the design to return specs for RFQ prefill
    const design = await this.designsService.getDesignById(id, req.user?.id);

    // Return specs that can be used to prefill the RFQ form
    return {
      success: true,
      designId: design.id,
      imageUrl: design.imageUrl,
      prefill: {
        jewelleryType: design.jewelryType,
        buildMethod: design.buildMethod,
        metalType: design.metalType,
        metalColor: design.metalColor,
        weightCategory: design.weightCategory,
        estimatedWeight: design.estimatedWeight,
        surfaceFinish: design.surfaceFinish,
        hasGemstones: design.hasGemstones,
        gemstone: design.hasGemstones
          ? {
              type: design.primaryStone,
              shape: design.stoneCut,
              size: design.stoneCarat?.toString(),
              color: design.stoneColor,
              count: 1, // Default to 1
              settingStyle: design.settingStyle,
            }
          : undefined,
        description:
          (design.additionalSpecs as Record<string, unknown>)?.description ||
          "",
        // Include design preview image as reference
        referenceImages: design.imageUrl ? [design.imageUrl] : [],
      },
    };
  }

  /**
   * Update design visibility (public/private)
   */
  @Patch(":id/visibility")
  @UseGuards(JwtAuthGuard)
  async updateVisibility(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateVisibilityDto,
  ) {
    return this.designsService.updateDesignVisibility(
      id,
      req.user!.id,
      dto.isPublic,
    );
  }

  /**
   * Delete a design
   */
  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  async deleteDesign(
    @Param("id") id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const isAdmin = req.user?.role === "ADMIN";
    return this.designsService.deleteDesign(id, req.user!.id, isAdmin);
  }

  /**
   * Get AI description service status (Admin only)
   */
  @Get("admin/description-service-status")
  @UseGuards(JwtAuthGuard)
  async getDescriptionServiceStatus(@Request() req: AuthenticatedRequest) {
    if (req.user?.role !== "ADMIN") {
      throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
    }

    return this.descriptionGenService.getServiceStatus();
  }

  /**
   * Update AI description daily request limit (Admin only)
   */
  @Patch("admin/description-service/daily-limit")
  @UseGuards(JwtAuthGuard)
  async updateDescriptionDailyLimit(
    @Request() req: AuthenticatedRequest,
    @Body() body: { limit: number },
  ) {
    if (req.user?.role !== "ADMIN") {
      throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
    }

    if (!body.limit || typeof body.limit !== "number") {
      throw new HttpException("Invalid limit value", HttpStatus.BAD_REQUEST);
    }

    return this.descriptionGenService.updateDailyLimit(body.limit);
  }

  /**
   * Reset AI description rate limit (Admin only)
   */
  @Post("admin/description-service/reset-rate-limit")
  @UseGuards(JwtAuthGuard)
  async resetDescriptionRateLimit(@Request() req: AuthenticatedRequest) {
    if (req.user?.role !== "ADMIN") {
      throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
    }

    return this.descriptionGenService.resetRateLimit();
  }

  /**
   * Clear AI description queue (Admin only)
   */
  @Post("admin/description-service/clear-queue")
  @UseGuards(JwtAuthGuard)
  async clearDescriptionQueue(@Request() req: AuthenticatedRequest) {
    if (req.user?.role !== "ADMIN") {
      throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
    }

    return this.descriptionGenService.clearQueue();
  }

  /**
   * Force process AI description queue (Admin only)
   */
  @Post("admin/description-service/process-queue")
  @UseGuards(JwtAuthGuard)
  async processDescriptionQueue(@Request() req: AuthenticatedRequest) {
    if (req.user?.role !== "ADMIN") {
      throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
    }

    return this.descriptionGenService.forceProcessQueue();
  }
}
