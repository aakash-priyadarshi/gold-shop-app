import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
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

  // Public endpoint for verified shops listing (for /shops page)
  @Get('public')
  @ApiOperation({ summary: 'List all verified public shops' })
  async findPublicShops(
    @Query('country') country?: string,
    @Query('state') state?: string,
    @Query('city') city?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.shopsService.findAll({
      country,
      city,
      verified: true, // Only verified shops
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 50,
    });
  }

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

  @Get('my-shops')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all shops owned by current user' })
  async getMyShops(@CurrentUser('id') userId: string) {
    return this.shopsService.findAllByUserId(userId);
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

  @Post('setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete shop setup for OAuth SHOPKEEPER users' })
  async setupShop(@CurrentUser('id') userId: string, @Body() dto: CreateShopDto) {
    // This endpoint allows shopkeepers who signed up via Google OAuth to create their shop
    return this.shopsService.setupShopForOAuthUser(userId, dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // MY SHOP ENDPOINTS (for authenticated shopkeeper)
  // ═══════════════════════════════════════════════════════════════

  @Get('my-shop/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get shop settings' })
  async getMyShopSettings(@CurrentUser('id') userId: string) {
    return this.shopsService.getShopSettings(userId);
  }

  @Patch('my-shop/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update shop settings' })
  async updateMyShopSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateShopDto,
  ) {
    return this.shopsService.updateShopSettings(userId, dto);
  }

  @Get('my-shop/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get shop analytics' })
  async getMyShopAnalytics(
    @CurrentUser('shopId') shopId: string,
    @Query('period') period?: string,
  ) {
    return this.shopsService.getShopAnalytics(shopId, period);
  }

  @Get('my-shop/materials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get shop materials inventory' })
  async getMyShopMaterials(@CurrentUser('shopId') shopId: string) {
    return this.shopsService.getShopMaterials(shopId);
  }

  @Put('my-shop/materials')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update shop materials inventory' })
  async updateMyShopMaterials(
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { materials: Array<{ materialCode: string; isAvailable: boolean; pricePerGramNpr?: number }> },
  ) {
    return this.shopsService.updateShopMaterials(shopId, userId, dto.materials);
  }

  @Get('my-shop/capabilities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get shop capabilities (jewellery types)' })
  async getMyShopCapabilities(@CurrentUser('shopId') shopId: string) {
    return this.shopsService.getShopCapabilities(shopId);
  }

  @Put('my-shop/capabilities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOPKEEPER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update shop capabilities' })
  async updateMyShopCapabilities(
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { jewelleryTypes: string[]; buildMethods?: string[] },
  ) {
    return this.shopsService.updateShopCapabilities(shopId, userId, dto);
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

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
