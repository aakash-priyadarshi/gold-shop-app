import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('offers')
@Controller('offers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OffersController {
  constructor(private offersService: OffersService) {}

  @Post()
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: 'Create an offer for an RFQ' })
  async create(
    @CurrentUser('shopId') shopId: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offersService.create(shopId, dto);
  }

  @Post(':id/counter')
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: 'Create a counter-offer' })
  async counter(
    @Param('id') id: string,
    @CurrentUser('shopId') shopId: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offersService.createCounterOffer(id, shopId, dto);
  }

  @Get('rfq/:rfqId')
  @ApiOperation({ summary: 'Get all offers for an RFQ' })
  async findByRfq(@Param('rfqId') rfqId: string) {
    return this.offersService.findByRfq(rfqId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get offer details' })
  async findOne(@Param('id') id: string) {
    return this.offersService.findOne(id);
  }

  @Patch(':id/withdraw')
  @Roles(UserRole.SHOPKEEPER)
  @ApiOperation({ summary: 'Withdraw an offer' })
  async withdraw(
    @Param('id') id: string,
    @CurrentUser('shopId') shopId: string,
  ) {
    return this.offersService.withdraw(id, shopId);
  }
}
