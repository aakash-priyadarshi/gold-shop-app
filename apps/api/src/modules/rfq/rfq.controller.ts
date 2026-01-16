import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RfqService } from './rfq.service';
import { CreateRfqDto } from './dto/create-rfq.dto';
import { CreateWalkInRfqDto } from './dto/create-walkin-rfq.dto';
import { BroadcastRfqDto } from './dto/broadcast-rfq.dto';
import { SelectOfferDto } from './dto/select-offer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, RfqStatus } from '@prisma/client';

@ApiTags('rfq')
@Controller('rfq')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RfqController {
  constructor(private rfqService: RfqService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Create a new RFQ (Request for Quote)' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateRfqDto) {
    return this.rfqService.create(userId, dto);
  }

  @Get('my-requests')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'List all RFQs for current customer' })
  async findMyRequests(
    @CurrentUser('id') userId: string,
    @Query('status') status?: RfqStatus,
  ) {
    return this.rfqService.findAllForCustomer(userId, status);
  }

  @Get('shop-requests')
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: 'List all RFQs received by shop' })
  async findShopRequests(@CurrentUser('shopId') shopId: string) {
    return this.rfqService.findAllForShop(shopId);
  }

  @Post('walk-in')
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: 'Create a walk-in RFQ for a customer visiting the shop' })
  async createWalkIn(
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWalkInRfqDto,
  ) {
    return this.rfqService.createWalkIn(shopId, userId, dto);
  }

  @Get('shop-walk-ins')
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: 'List all walk-in RFQs created by this shop' })
  async findWalkInRfqs(
    @CurrentUser('shopId') shopId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.rfqService.findWalkInRfqsForShop(shopId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get RFQ details' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.rfqService.findOne(id, userId, role);
  }

  @Get(':id/eligible-shops')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Get shops eligible to receive this RFQ with price estimates' })
  async getEligibleShops(
    @Param('id') id: string,
    @Query('customerCity') customerCity?: string,
  ) {
    return this.rfqService.getEligibleShops(id, customerCity);
  }

  @Post(':id/broadcast')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Broadcast RFQ to selected shops' })
  async broadcast(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: BroadcastRfqDto,
  ) {
    return this.rfqService.broadcast(id, userId, dto);
  }

  @Post(':id/select-offer')
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Select an offer for the RFQ' })
  async selectOffer(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SelectOfferDto,
  ) {
    return this.rfqService.selectOffer(id, dto.offerId, userId);
  }
}
