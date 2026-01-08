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
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryFilterDto,
} from './dto/inventory.dto';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  // Public endpoints
  @Get()
  @ApiOperation({ summary: 'Search inventory items' })
  async findAll(@Query() filters: InventoryFilterDto) {
    return this.inventoryService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item details' })
  async findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  // Protected endpoints for shopkeepers
  @Post('shop/:shopId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SHOPKEEPER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create inventory item' })
  async create(
    @Param('shopId') shopId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.inventoryService.create(shopId, userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SHOPKEEPER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update inventory item' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SHOPKEEPER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete inventory item' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.inventoryService.delete(id, userId);
  }

  @Get('shop/:shopId/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SHOPKEEPER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get shop inventory (for owner)' })
  async getShopInventory(
    @Param('shopId') shopId: string,
    @CurrentUser('id') userId: string,
    @Query() filters: InventoryFilterDto,
  ) {
    return this.inventoryService.findShopInventory(shopId, userId, filters);
  }

  @Get('shop/:shopId/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SHOPKEEPER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get inventory statistics' })
  async getStats(@Param('shopId') shopId: string) {
    return this.inventoryService.getInventoryStats(shopId);
  }

  @Patch('shop/:shopId/bulk-prices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SHOPKEEPER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update prices' })
  async bulkUpdatePrices(
    @Param('shopId') shopId: string,
    @CurrentUser('id') userId: string,
    @Body() updates: { itemId: string; totalPriceNpr: number }[],
  ) {
    return this.inventoryService.bulkUpdatePrices(shopId, userId, updates);
  }
}
