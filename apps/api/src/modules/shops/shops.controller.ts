import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { UpdateMetalRatesDto } from './dto/update-metal-rates.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('shops')
@Controller('shops')
export class ShopsController {
  constructor(private shopsService: ShopsService) {}

  @Get()
  @ApiOperation({ summary: 'List all shops' })
  async findAll(
    @Query('country') country?: string,
    @Query('city') city?: string,
    @Query('jewelleryType') jewelleryType?: string,
    @Query('method') method?: string,
    @Query('verified') verified?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.shopsService.findAll({
      country,
      city,
      jewelleryType,
      method,
      verified: verified !== undefined ? verified === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  @Get('my-shop')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user shop' })
  async getMyShop(@CurrentUser('id') userId: string) {
    return this.shopsService.findByUserId(userId);
  }

  @Get('my-shop/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get shop dashboard' })
  async getDashboard(@CurrentUser('shopId') shopId: string) {
    return this.shopsService.getShopDashboard(shopId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new shop' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateShopDto) {
    return this.shopsService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shop by ID' })
  async findOne(@Param('id') id: string) {
    return this.shopsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update shop details' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateShopDto,
  ) {
    return this.shopsService.update(id, userId, dto);
  }

  @Patch(':id/metal-rates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update shop metal rates' })
  async updateMetalRates(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMetalRatesDto,
  ) {
    return this.shopsService.updateMetalRates(id, userId, dto);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a shop (Admin only)' })
  async verify(@Param('id') id: string, @CurrentUser('id') adminId: string) {
    return this.shopsService.verifyShop(id, adminId);
  }
}
