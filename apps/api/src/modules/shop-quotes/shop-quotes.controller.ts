import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ShopQuotesService } from './shop-quotes.service';
import {
  CreateShopQuoteDto,
  UpdateShopQuoteDto,
  UpdateQuoteStatusDto,
  RecordPaymentDto,
  LookupCustomerDto,
  SearchCustomersDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, ShopQuoteStatus } from '@prisma/client';

@ApiTags('shop-quotes')
@Controller('shop-quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ShopQuotesController {
  constructor(private shopQuotesService: ShopQuotesService) {}

  @Post('lookup-customer')
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ 
    summary: 'Lookup walk-in customer by phone number',
    description: 'Uses Redis cache for fast lookup. Returns customer details and recent orders if found.',
  })
  async lookupCustomer(
    @CurrentUser('shopId') shopId: string,
    @Body() dto: LookupCustomerDto,
  ) {
    return this.shopQuotesService.lookupCustomerByPhone(
      dto.phoneCountryCode,
      dto.phone,
      shopId,
    );
  }

  @Post('search-customers')
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({
    summary: 'Search walk-in customers by partial phone number',
    description: 'Returns up to 5 matching customers for live suggestions as the seller types.',
  })
  async searchCustomers(
    @CurrentUser('shopId') shopId: string,
    @Body() dto: SearchCustomersDto,
  ) {
    return this.shopQuotesService.searchCustomersByPhone(
      dto.phoneCountryCode,
      dto.phone,
      shopId,
    );
  }

  @Post()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: 'Create a new quote for a walk-in customer' })
  async create(
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateShopQuoteDto,
  ) {
    return this.shopQuotesService.create(shopId, userId, dto);
  }

  @Get()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: 'List all quotes for current shop' })
  @ApiQuery({ name: 'status', required: false, enum: ShopQuoteStatus })
  async findAll(
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('id') userId: string,
    @Query('status') status?: ShopQuoteStatus,
  ) {
    return this.shopQuotesService.findAllForShop(shopId, userId, status);
  }

  @Get('stats')
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: 'Get quote statistics for current shop' })
  async getStats(
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.shopQuotesService.getStats(shopId, userId);
  }

  @Get('customer/:customerId')
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: 'Get customer history and their quotes' })
  async getCustomerHistory(
    @Param('customerId') customerId: string,
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.shopQuotesService.getCustomerHistory(customerId, shopId, userId);
  }

  @Get(':id')
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: 'Get quote details by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.shopQuotesService.findOne(id, shopId, userId);
  }

  @Put(':id')
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: 'Update quote details (pricing, notes)' })
  async update(
    @Param('id') id: string,
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateShopQuoteDto,
  ) {
    return this.shopQuotesService.update(id, shopId, userId, dto);
  }

  @Put(':id/status')
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: 'Update quote status (confirm, start, complete, cancel)' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateQuoteStatusDto,
  ) {
    return this.shopQuotesService.updateStatus(id, shopId, userId, dto);
  }

  @Post(':id/payment')
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: 'Record a payment on the quote' })
  async recordPayment(
    @Param('id') id: string,
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.shopQuotesService.recordPayment(id, shopId, userId, dto);
  }
}
