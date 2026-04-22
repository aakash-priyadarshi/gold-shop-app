import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BuildMethod,
  DesignImageSource,
  JewelleryType,
  Prisma,
  WeightCategory,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { DescriptionGeneratorService } from "./description-generator.service";
import { ImageGenerationService } from "./image-generation.service";

interface CreateDesignDto {
  jewelryType: JewelleryType;
  buildMethod: BuildMethod;
  metalType?: string;
  metalColor?: string;
  metalDescription?: string;
  weightCategory?: WeightCategory;
  estimatedWeight?: number;
  surfaceFinish?: string;
  hasGemstones?: boolean;
  primaryStone?: string;
  stoneCut?: string;
  stoneCarat?: number;
  stoneColor?: string;
  stoneClarity?: string;
  stoneCutGrade?: string;
  stoneCount?: number;
  settingStyle?: string;
  additionalSpecs?: Record<string, unknown>;
  referenceImageUrl?: string;
  shareToGallery?: boolean;
  creatorName?: string;
  // Method-specific details
  alloyDetails?: {
    baseMetal?: string;
    karat?: string;
    alloyFamily?: string;
    recipePresetId?: string;
  };
  platingDetails?: {
    baseMetal?: string;
    platingType?: string;
    platingTier?: string;
  };
  italianMachineDetails?: {
    purity?: string;
    chainStyle?: string;
  };
  gemstones?: Array<{
    stoneType?: string;
    shape?: string;
    color?: string;
    clarity?: string;
    cut?: string;
    settingStyle?: string;
    count?: number;
    sizeValue?: number;
    sizeUnit?: string;
  }>;
}

interface DesignFilters {
  jewelryType?: JewelleryType;
  buildMethod?: BuildMethod;
  metalType?: string;
  primaryStone?: string;
  hasGemstones?: boolean;
  creatorId?: string;
  isFeatured?: boolean;
}

type SortOption = "popular" | "liked" | "trending" | "newest" | "most_made";

@Injectable()
export class DesignsService {
  private readonly logger = new Logger(DesignsService.name);
  private readonly imageWorkerUrl: string;

  constructor(
    private prisma: PrismaService,
    private imageGenService: ImageGenerationService,
    private descriptionGenService: DescriptionGeneratorService,
    private configService: ConfigService,
  ) {
    // Use existing Cloudflare Worker for image uploads
    this.imageWorkerUrl =
      this.configService.get<string>("IMAGE_WORKER_URL") ||
      "https://images.orivraa.com";
  }

  /**
   * Create a new design with AI-generated image
   */
  async createDesign(userId: string, dto: CreateDesignDto) {
    // Generate spec hash for caching - includes description and regeneration feedback
    const specHash = this.imageGenService.generateSpecHash({
      jewelryType: dto.jewelryType,
      buildMethod: dto.buildMethod,
      metalType: dto.metalType,
      metalColor: dto.metalColor,
      weightCategory: dto.weightCategory,
      estimatedWeight: dto.estimatedWeight,
      surfaceFinish: dto.surfaceFinish,
      hasGemstones: dto.hasGemstones,
      primaryStone: dto.primaryStone,
      stoneCut: dto.stoneCut,
      stoneCarat: dto.stoneCarat,
      stoneColor: dto.stoneColor,
      settingStyle: dto.settingStyle,
      // Include additionalSpecs for cache key to generate new images on regeneration
      additionalSpecs: dto.additionalSpecs,
    });

    // Check if identical design already exists
    const existingDesign = await this.prisma.design.findUnique({
      where: { imageHash: specHash },
    });

    if (existingDesign) {
      this.logger.log(`Found cached design with hash: ${specHash}`);

      // Increment view count
      await this.prisma.design.update({
        where: { id: existingDesign.id },
        data: { viewsCount: { increment: 1 } },
      });

      return {
        design: existingDesign,
        cached: true,
      };
    }

    // Determine image source and generate/refine image
    let imageResult;
    let imageSource: DesignImageSource = DesignImageSource.GENERATED;

    if (dto.referenceImageUrl) {
      // Customer provided a reference image - refine it
      imageResult = await this.imageGenService.refineImage(
        dto.referenceImageUrl,
        {
          jewelryType: dto.jewelryType,
          buildMethod: dto.buildMethod,
          metalType: dto.metalType,
          metalColor: dto.metalColor,
          surfaceFinish: dto.surfaceFinish,
          hasGemstones: dto.hasGemstones,
          primaryStone: dto.primaryStone,
          stoneCut: dto.stoneCut,
          stoneCarat: dto.stoneCarat,
          stoneColor: dto.stoneColor,
          settingStyle: dto.settingStyle,
        },
      );
      imageSource = DesignImageSource.REFINED;
    } else {
      // Generate from scratch with all enhanced details
      imageResult = await this.imageGenService.generateImage({
        jewelryType: dto.jewelryType,
        buildMethod: dto.buildMethod,
        metalType: dto.metalType,
        metalColor: dto.metalColor,
        metalDescription: dto.metalDescription,
        weightCategory: dto.weightCategory,
        estimatedWeight: dto.estimatedWeight,
        surfaceFinish: dto.surfaceFinish,
        hasGemstones: dto.hasGemstones,
        primaryStone: dto.primaryStone,
        stoneCut: dto.stoneCut,
        stoneCarat: dto.stoneCarat,
        stoneColor: dto.stoneColor,
        stoneClarity: dto.stoneClarity,
        stoneCutGrade: dto.stoneCutGrade,
        stoneCount: dto.stoneCount,
        settingStyle: dto.settingStyle,
        // Method-specific details for enhanced prompts
        alloyDetails: dto.alloyDetails,
        platingDetails: dto.platingDetails,
        italianMachineDetails: dto.italianMachineDetails,
        gemstones: dto.gemstones,
        // Include user's description and regeneration feedback for prompt building
        additionalSpecs: dto.additionalSpecs,
      });
    }

    // Upload image to R2
    const imageUrl = await this.uploadImageToR2(imageResult.imageUrl, specHash);

    // Get user info for creator name
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const creatorDisplayName =
      dto.creatorName ||
      (user
        ? `${user.firstName} ${user.lastName?.charAt(0) || ""}`.trim()
        : "Anonymous");

    // Generate AI description for the design
    // This runs in parallel-ish with image generation being already complete
    const descriptionSpecs = {
      jewelryType: dto.jewelryType,
      metalType: dto.metalType || "",
      metalColor: dto.metalColor,
      karat:
        dto.alloyDetails?.karat || this.extractKaratFromMetal(dto.metalType),
      surfaceFinish: dto.surfaceFinish,
      hasGemstones: dto.hasGemstones || false,
      gemstoneType: dto.primaryStone,
      gemstoneShape: dto.stoneCut,
      gemstoneColor: dto.stoneColor,
      settingStyle: dto.settingStyle,
    };

    // Generate description - this will use AI with template fallback
    const generatedDescription =
      await this.descriptionGenService.generateDescription(
        specHash, // Use specHash as temporary ID, will update with real ID
        descriptionSpecs,
      );

    // Create the design record with description
    const design = await this.prisma.design.create({
      data: {
        jewelryType: dto.jewelryType,
        buildMethod: dto.buildMethod,
        metalType: dto.metalType,
        metalColor: dto.metalColor,
        weightCategory: dto.weightCategory,
        estimatedWeight: dto.estimatedWeight,
        surfaceFinish: dto.surfaceFinish,
        hasGemstones: dto.hasGemstones || false,
        primaryStone: dto.primaryStone,
        stoneCut: dto.stoneCut,
        stoneCarat: dto.stoneCarat,
        stoneColor: dto.stoneColor,
        settingStyle: dto.settingStyle,
        additionalSpecs: {
          ...(dto.additionalSpecs || {}),
          description: generatedDescription,
          descriptionGeneratedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        generationPrompt: imageResult.prompt,
        imageUrl,
        imageHash: specHash,
        imageSource,
        creatorId: userId,
        creatorName: creatorDisplayName,
        isPublic: dto.shareToGallery !== false, // Default to true (checked)
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      design,
      cached: false,
    };
  }

  /**
   * Extract karat from metal type string (e.g., "GOLD_18K" -> "18K")
   */
  private extractKaratFromMetal(metalType?: string): string | undefined {
    if (!metalType) return undefined;
    const match = metalType.match(/(\d+K)/i);
    return match ? match[1].toUpperCase() : undefined;
  }

  /**
   * Upload base64 image to R2 storage via Cloudflare Worker
   */
  private async uploadImageToR2(
    base64DataUrl: string,
    hash: string,
  ): Promise<string> {
    try {
      // Extract base64 data from data URL
      const matches = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        throw new Error("Invalid base64 image format");
      }

      const format = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      // Create a blob from buffer
      const blob = new Blob([buffer], { type: `image/${format}` });

      // Create FormData to upload to worker
      const formData = new FormData();
      formData.append("file", blob, `design-${hash}.${format}`);

      // Upload to the existing Cloudflare Worker
      const response = await fetch(`${this.imageWorkerUrl}/upload`, {
        method: "POST",
        headers: {
          "X-Upload-Type": "designs",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Worker upload failed: ${response.status} - ${errorText}`,
        );
        // Fallback to base64 if worker upload fails
        return base64DataUrl;
      }

      const result = (await response.json()) as {
        success: boolean;
        url?: string;
        error?: string;
      };

      if (result.success && result.url) {
        this.logger.log(`Image uploaded to R2 via worker: ${result.url}`);
        return result.url;
      }

      this.logger.warn(`Worker upload returned success=false: ${result.error}`);
      return base64DataUrl;
    } catch (error) {
      this.logger.error(`Failed to upload image via worker: ${error}`);
      // Fallback to base64 URL if upload fails
      return base64DataUrl;
    }
  }

  /**
   * Get designs for the gallery with filtering and sorting
   */
  async getDesigns(
    filters: DesignFilters,
    sort: SortOption = "popular",
    page: number = 1,
    limit: number = 20,
  ) {
    const where: Prisma.DesignWhereInput = {
      isPublic: true,
      isApproved: true,
    };

    if (filters.jewelryType) {
      where.jewelryType = filters.jewelryType;
    }
    if (filters.buildMethod) {
      where.buildMethod = filters.buildMethod;
    }
    if (filters.metalType) {
      where.metalType = filters.metalType;
    }
    if (filters.primaryStone) {
      where.primaryStone = filters.primaryStone;
    }
    if (filters.hasGemstones !== undefined) {
      where.hasGemstones = filters.hasGemstones;
    }
    if (filters.creatorId) {
      where.creatorId = filters.creatorId;
    }
    if (filters.isFeatured) {
      where.isFeatured = true;
    }

    // Determine sort order
    let orderBy: Prisma.DesignOrderByWithRelationInput;
    switch (sort) {
      case "popular":
        orderBy = { ordersCount: "desc" };
        break;
      case "liked":
        orderBy = { likesCount: "desc" };
        break;
      case "trending":
        // For trending, we'd ideally use a time-weighted score
        // For now, use a combination
        orderBy = { likesCount: "desc" };
        break;
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "most_made":
        orderBy = { ordersCompleted: "desc" };
        break;
      default:
        orderBy = { ordersCount: "desc" };
    }

    const [designs, total] = await Promise.all([
      this.prisma.design.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
            },
          },
          _count: {
            select: {
              likes: true,
            },
          },
        },
      }),
      this.prisma.design.count({ where }),
    ]);

    return {
      designs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single design by ID
   */
  async getDesignById(id: string, userId?: string) {
    const design = await this.prisma.design.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    if (!design) {
      throw new NotFoundException("Design not found");
    }

    // Check if user has liked this design
    let isLiked = false;
    if (userId) {
      const like = await this.prisma.designLike.findUnique({
        where: {
          designId_userId: {
            designId: id,
            userId,
          },
        },
      });
      isLiked = !!like;
    }

    // Increment view count
    await this.prisma.design.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    return {
      ...design,
      isLiked,
    };
  }

  /**
   * Get user's own designs
   */
  async getMyDesigns(userId: string, page: number = 1, limit: number = 20) {
    const [designs, total] = await Promise.all([
      this.prisma.design.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              likes: true,
            },
          },
        },
      }),
      this.prisma.design.count({ where: { creatorId: userId } }),
    ]);

    return {
      designs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Like a design
   */
  async likeDesign(designId: string, userId: string) {
    // Check if design exists
    const design = await this.prisma.design.findUnique({
      where: { id: designId },
    });

    if (!design) {
      throw new NotFoundException("Design not found");
    }

    // Check if already liked
    const existingLike = await this.prisma.designLike.findUnique({
      where: {
        designId_userId: {
          designId,
          userId,
        },
      },
    });

    if (existingLike) {
      throw new BadRequestException("Design already liked");
    }

    // Create like and increment count
    await this.prisma.$transaction([
      this.prisma.designLike.create({
        data: {
          designId,
          userId,
        },
      }),
      this.prisma.design.update({
        where: { id: designId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    return { success: true };
  }

  /**
   * Unlike a design
   */
  async unlikeDesign(designId: string, userId: string) {
    // Check if like exists
    const existingLike = await this.prisma.designLike.findUnique({
      where: {
        designId_userId: {
          designId,
          userId,
        },
      },
    });

    if (!existingLike) {
      throw new BadRequestException("Design not liked");
    }

    // Delete like and decrement count
    await this.prisma.$transaction([
      this.prisma.designLike.delete({
        where: { id: existingLike.id },
      }),
      this.prisma.design.update({
        where: { id: designId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);

    return { success: true };
  }

  /**
   * Increment "Build me this" count (when user starts RFQ from design)
   */
  async incrementOrdersCount(designId: string) {
    await this.prisma.design.update({
      where: { id: designId },
      data: { ordersCount: { increment: 1 } },
    });
  }

  /**
   * Increment completed orders count (when order is actually delivered)
   */
  async incrementOrdersCompleted(designId: string) {
    await this.prisma.design.update({
      where: { id: designId },
      data: { ordersCompleted: { increment: 1 } },
    });
  }

  /**
   * Update design visibility
   */
  async updateDesignVisibility(
    designId: string,
    userId: string,
    isPublic: boolean,
  ) {
    const design = await this.prisma.design.findUnique({
      where: { id: designId },
    });

    if (!design) {
      throw new NotFoundException("Design not found");
    }

    if (design.creatorId !== userId) {
      throw new ForbiddenException("You can only update your own designs");
    }

    return this.prisma.design.update({
      where: { id: designId },
      data: { isPublic },
    });
  }

  /**
   * Delete a design (creator or admin can delete)
   */
  async deleteDesign(designId: string, userId: string, isAdmin = false) {
    const design = await this.prisma.design.findUnique({
      where: { id: designId },
    });

    if (!design) {
      throw new NotFoundException("Design not found");
    }

    if (!isAdmin && design.creatorId !== userId) {
      throw new ForbiddenException("You can only delete your own designs");
    }

    await this.prisma.design.delete({
      where: { id: designId },
    });

    return { success: true };
  }

  /**
   * Get featured designs for homepage
   */
  async getFeaturedDesigns(limit: number = 8) {
    return this.prisma.design.findMany({
      where: {
        isPublic: true,
        isApproved: true,
        isFeatured: true,
      },
      orderBy: { ordersCount: "desc" },
      take: limit,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
          },
        },
      },
    });
  }

  /**
   * Get similar designs based on characteristic matching
   * Only returns designs that match at least 80% of provided characteristics
   */
  async getSimilarDesigns(
    specs: {
      jewelryType: JewelleryType;
      buildMethod?: BuildMethod;
      metalType?: string;
      hasGemstones?: boolean;
      primaryStone?: string;
      surfaceFinish?: string;
    },
    limit: number = 6,
  ) {
    // Count provided characteristics (excluding jewelryType which is mandatory)
    const characteristics: { field: string; value: unknown }[] = [];

    if (specs.buildMethod)
      characteristics.push({ field: "buildMethod", value: specs.buildMethod });
    if (specs.metalType)
      characteristics.push({ field: "metalType", value: specs.metalType });
    if (specs.hasGemstones !== undefined)
      characteristics.push({
        field: "hasGemstones",
        value: specs.hasGemstones,
      });
    if (specs.primaryStone)
      characteristics.push({
        field: "primaryStone",
        value: specs.primaryStone,
      });
    if (specs.surfaceFinish)
      characteristics.push({
        field: "surfaceFinish",
        value: specs.surfaceFinish,
      });

    // First, get all public designs of the same jewelry type
    const candidateDesigns = await this.prisma.design.findMany({
      where: {
        isPublic: true,
        isApproved: true,
        jewelryType: specs.jewelryType,
      },
      orderBy: [{ ordersCount: "desc" }, { likesCount: "desc" }],
      take: 50, // Get more candidates to filter
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
          },
        },
      },
    });

    // Calculate similarity score for each design
    const scoredDesigns = candidateDesigns.map((design) => {
      let matchCount = 0;
      const totalCharacteristics = characteristics.length;

      for (const char of characteristics) {
        const designValue = (design as Record<string, unknown>)[char.field];
        if (designValue === char.value) {
          matchCount++;
        }
      }

      // Calculate similarity percentage (jewelryType always matches, so add 1)
      const similarityScore =
        totalCharacteristics > 0
          ? ((matchCount + 1) / (totalCharacteristics + 1)) * 100
          : 100; // If no characteristics provided, 100% match on jewelryType alone

      return {
        ...design,
        similarityScore,
        matchedCharacteristics: matchCount + 1, // +1 for jewelryType
        totalCharacteristics: totalCharacteristics + 1,
      };
    });

    // Filter to only designs with 80%+ similarity
    const similarDesigns = scoredDesigns
      .filter((d) => d.similarityScore >= 80)
      .sort((a, b) => {
        // Sort by similarity first, then by popularity
        if (b.similarityScore !== a.similarityScore) {
          return b.similarityScore - a.similarityScore;
        }
        return (b.ordersCount || 0) - (a.ordersCount || 0);
      })
      .slice(0, limit);

    return {
      designs: similarDesigns,
      total: similarDesigns.length,
      jewelryType: specs.jewelryType,
    };
  }

  /**
   * Get design stats for admin dashboard
   */
  async getDesignStats() {
    const [totalDesigns, publicDesigns, totalLikes, totalOrders] =
      await Promise.all([
        this.prisma.design.count(),
        this.prisma.design.count({ where: { isPublic: true } }),
        this.prisma.designLike.count(),
        this.prisma.design.aggregate({
          _sum: { ordersCount: true },
        }),
      ]);

    return {
      totalDesigns,
      publicDesigns,
      totalLikes,
      totalOrders: totalOrders._sum.ordersCount || 0,
    };
  }
}
