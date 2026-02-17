import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductVariantsService } from './product-variants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateVariantDto,
  BulkCreateVariantsDto,
  UpdateVariantDto,
  ToggleSizesDto,
} from './dto/variant.dto';

@ApiTags('product-variants')
@Controller('inventory/:itemId/variants')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductVariantsController {
  constructor(private service: ProductVariantsService) {}

  @Patch('toggle-sizes')
  @Roles('SHOPKEEPER')
  @ApiOperation({ summary: 'Enable/disable size support for an inventory item' })
  async toggleSizes(
    @CurrentUser('shopId') shopId: string,
    @Param('itemId') itemId: string,
    @Body() dto: ToggleSizesDto,
  ) {
    return this.service.toggleSizes(itemId, shopId, dto.hasSizes);
  }

  @Get()
  @ApiOperation({ summary: 'List all variants for an inventory item' })
  async listVariants(@Param('itemId') itemId: string) {
    return this.service.listVariants(itemId);
  }

  @Post()
  @Roles('SHOPKEEPER')
  @ApiOperation({ summary: 'Create a size variant' })
  async createVariant(
    @CurrentUser('shopId') shopId: string,
    @Param('itemId') itemId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.service.createVariant(itemId, shopId, dto);
  }

  @Post('bulk')
  @Roles('SHOPKEEPER')
  @ApiOperation({ summary: 'Bulk create size variants' })
  async bulkCreate(
    @CurrentUser('shopId') shopId: string,
    @Param('itemId') itemId: string,
    @Body() dto: BulkCreateVariantsDto,
  ) {
    return this.service.bulkCreateVariants(itemId, shopId, dto.variants);
  }

  @Patch(':variantId')
  @Roles('SHOPKEEPER')
  @ApiOperation({ summary: 'Update a variant (stock, price, active)' })
  async updateVariant(
    @CurrentUser('shopId') shopId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.service.updateVariant(variantId, shopId, dto);
  }

  @Delete(':variantId')
  @Roles('SHOPKEEPER')
  @ApiOperation({ summary: 'Delete a variant' })
  async deleteVariant(
    @CurrentUser('shopId') shopId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.service.deleteVariant(variantId, shopId);
  }
}

// Separate controller for size charts (public reference)
@ApiTags('size-charts')
@Controller('size-charts')
export class SizeChartsController {
  constructor(private service: ProductVariantsService) {}

  @Get(':jewelleryType')
  @ApiOperation({ summary: 'Get size chart for a jewellery type' })
  async getSizeChart(
    @Param('jewelleryType') jewelleryType: string,
    @Query('region') region?: string,
  ) {
    return this.service.getSizeChart(jewelleryType, region);
  }
}
