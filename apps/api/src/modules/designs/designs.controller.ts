import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DesignsService } from './designs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import {
  JewelleryType,
  BuildMethod,
  WeightCategory,
} from '@prisma/client';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

class CreateDesignDto {
  jewelryType: JewelleryType;
  buildMethod: BuildMethod;
  metalType?: string;
  metalColor?: string;
  weightCategory?: WeightCategory;
  estimatedWeight?: number;
  surfaceFinish?: string;
  hasGemstones?: boolean;
  primaryStone?: string;
  stoneCut?: string;
  stoneCarat?: number;
  stoneColor?: string;
  settingStyle?: string;
  additionalSpecs?: Record<string, unknown>;
  referenceImageUrl?: string;
  shareToGallery?: boolean;
  creatorName?: string;
}

class UpdateVisibilityDto {
  isPublic: boolean;
}

@Controller('designs')
export class DesignsController {
  constructor(private readonly designsService: DesignsService) {}

  /**
   * Create a new design with AI-generated image
   * Requires authentication
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createDesign(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateDesignDto,
  ) {
    return this.designsService.createDesign(req.user!.id, dto);
  }

  /**
   * Get designs for the public gallery
   * Authentication optional (for checking if user liked)
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getDesigns(
    @Query('jewelryType') jewelryType?: JewelleryType,
    @Query('buildMethod') buildMethod?: BuildMethod,
    @Query('metalType') metalType?: string,
    @Query('primaryStone') primaryStone?: string,
    @Query('hasGemstones') hasGemstones?: string,
    @Query('featured') featured?: string,
    @Query('sort') sort?: 'popular' | 'liked' | 'trending' | 'newest' | 'most_made',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.designsService.getDesigns(
      {
        jewelryType,
        buildMethod,
        metalType,
        primaryStone,
        hasGemstones: hasGemstones === 'true' ? true : hasGemstones === 'false' ? false : undefined,
        isFeatured: featured === 'true',
      },
      sort || 'popular',
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
    );
  }

  /**
   * Get featured designs for homepage
   */
  @Get('featured')
  async getFeaturedDesigns(@Query('limit') limit?: string) {
    return this.designsService.getFeaturedDesigns(parseInt(limit || '8', 10));
  }

  /**
   * Get current user's designs
   */
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyDesigns(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.designsService.getMyDesigns(
      req.user!.id,
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
    );
  }

  /**
   * Get design stats (admin)
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getDesignStats() {
    return this.designsService.getDesignStats();
  }

  /**
   * Get a single design by ID
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getDesignById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.designsService.getDesignById(id, req.user?.id);
  }

  /**
   * Like a design
   */
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async likeDesign(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.designsService.likeDesign(id, req.user!.id);
  }

  /**
   * Unlike a design
   */
  @Delete(':id/like')
  @UseGuards(JwtAuthGuard)
  async unlikeDesign(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.designsService.unlikeDesign(id, req.user!.id);
  }

  /**
   * Track "Build me this" click and return specs for RFQ prefill
   */
  @Post(':id/build')
  @UseGuards(OptionalJwtAuthGuard)
  async buildFromDesign(
    @Param('id') id: string,
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
        gemstone: design.hasGemstones ? {
          type: design.primaryStone,
          shape: design.stoneCut,
          size: design.stoneCarat?.toString(),
          color: design.stoneColor,
          count: 1, // Default to 1
          settingStyle: design.settingStyle,
        } : undefined,
        description: (design.additionalSpecs as Record<string, unknown>)?.description || '',
        // Include design preview image as reference
        referenceImages: design.imageUrl ? [design.imageUrl] : [],
      },
    };
  }

  /**
   * Update design visibility (public/private)
   */
  @Patch(':id/visibility')
  @UseGuards(JwtAuthGuard)
  async updateVisibility(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateVisibilityDto,
  ) {
    return this.designsService.updateDesignVisibility(id, req.user!.id, dto.isPublic);
  }

  /**
   * Delete a design
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteDesign(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.designsService.deleteDesign(id, req.user!.id);
  }
}
