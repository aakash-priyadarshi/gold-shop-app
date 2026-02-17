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
import { RefundsService } from './refunds.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestRefundDto, RejectRefundDto, ProcessRefundDto } from './dto/refund.dto';

@ApiTags('refunds')
@Controller('refunds')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RefundsController {
  constructor(private refundsService: RefundsService) {}

  // ─── Customer endpoints ───

  @Post('request')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Request a refund for an order' })
  async requestRefund(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestRefundDto,
  ) {
    return this.refundsService.requestRefund(userId, dto.orderId, dto.reason);
  }

  @Get('eligibility/:orderId')
  @Roles('CUSTOMER', 'SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Check refund eligibility for an order' })
  async checkEligibility(@Param('orderId') orderId: string) {
    return this.refundsService.checkEligibility(orderId);
  }

  // ─── Support / Admin endpoints ───

  @Get('requests')
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'List all refund requests' })
  async listRequests(@Query('status') status?: string) {
    return this.refundsService.listRefundRequests(status);
  }

  @Patch(':orderId/approve')
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Approve a refund request' })
  async approveRefund(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.refundsService.approveRefund(orderId, userId);
  }

  @Patch(':orderId/reject')
  @Roles('SUPPORT', 'ADMIN')
  @ApiOperation({ summary: 'Reject a refund request' })
  async rejectRefund(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
    @Body() dto: RejectRefundDto,
  ) {
    return this.refundsService.rejectRefund(orderId, userId, dto.rejectionReason);
  }

  @Patch(':orderId/process')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Process an approved refund (trigger payout + commission reversal)' })
  async processRefund(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.refundsService.processRefund(orderId, userId);
  }
}
