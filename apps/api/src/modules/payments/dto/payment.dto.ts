import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentMethod {
  RAZORPAY = 'RAZORPAY',
  STRIPE = 'STRIPE',
  ESEWA = 'ESEWA',
  KHALTI = 'KHALTI',
  COD = 'COD',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum PaymentType {
  BOOKING_FEE = 'BOOKING_FEE',
  FULL_PAYMENT = 'FULL_PAYMENT',
  PARTIAL_PAYMENT = 'PARTIAL_PAYMENT',
  BALANCE_PAYMENT = 'BALANCE_PAYMENT',
  REFUND = 'REFUND',
}

export class InitiatePaymentDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Payment type' })
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @ApiProperty({ description: 'Payment method' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ description: 'Amount to pay (for partial payments)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;
}

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Payment ID from our system' })
  @IsString()
  paymentId: string;

  @ApiProperty({ description: 'Gateway payment ID' })
  @IsString()
  gatewayPaymentId: string;

  @ApiProperty({ description: 'Gateway order ID' })
  @IsString()
  gatewayOrderId: string;

  @ApiPropertyOptional({ description: 'Gateway signature for verification' })
  @IsString()
  @IsOptional()
  signature?: string;
}

export class InitiateBookingPaymentDto {
  @ApiProperty({ description: 'RFQ Request ID' })
  @IsString()
  rfqRequestId: string;

  @ApiProperty({ description: 'Offer ID' })
  @IsString()
  offerId: string;

  @ApiProperty({ description: 'Payment method' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}

export class RefundDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Refund amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Refund reason' })
  @IsString()
  @IsOptional()
  reason?: string;
}
