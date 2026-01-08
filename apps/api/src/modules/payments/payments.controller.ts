import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  InitiatePaymentDto,
  VerifyPaymentDto,
  InitiateBookingPaymentDto,
  RefundDto,
} from './dto/payment.dto';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('initiate')
  @Roles('CUSTOMER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Initiate payment for order' })
  async initiatePayment(
    @CurrentUser('id') userId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(userId, dto);
  }

  @Post('booking')
  @Roles('CUSTOMER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Initiate booking fee payment' })
  async initiateBookingPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: InitiateBookingPaymentDto,
  ) {
    return this.paymentsService.initiateBookingPayment(userId, dto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify payment callback' })
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(dto);
  }

  @Post('refund')
  @Roles('ADMIN', 'SHOPKEEPER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Process refund' })
  async processRefund(@Body() dto: RefundDto) {
    return this.paymentsService.processRefund(dto);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payments for order' })
  async getOrderPayments(@Param('orderId') orderId: string) {
    return this.paymentsService.getOrderPayments(orderId);
  }

  @Get('my-payments')
  @ApiOperation({ summary: 'Get user payment history' })
  async getMyPayments(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentsService.getUserPayments(userId, page, limit);
  }
}
