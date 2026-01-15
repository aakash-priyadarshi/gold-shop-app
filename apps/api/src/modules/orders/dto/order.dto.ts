import { IsString, IsOptional, IsNumber, IsEnum, ValidateNested, IsArray, IsBoolean, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrderType {
  INVENTORY = 'INVENTORY',
  CUSTOM = 'CUSTOM',
}

export class ShippingAddressDto {
  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsString()
  addressLine1: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty()
  @IsString()
  country: string;

  @ApiProperty()
  @IsString()
  pincode: string;
}

export class CreateInventoryOrderDto {
  @ApiProperty({ description: 'Inventory item ID to purchase' })
  @IsString()
  inventoryItemId: string;

  @ApiProperty({ description: 'Quantity to purchase' })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ description: 'Delivery address ID' })
  @IsString()
  @IsOptional()
  addressId?: string;

  @ApiPropertyOptional({ description: 'Shipping address object' })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  @IsOptional()
  shippingAddress?: ShippingAddressDto;

  @ApiPropertyOptional({ description: 'Special instructions' })
  @IsString()
  @IsOptional()
  instructions?: string;
}

export class CreateCustomOrderDto {
  @ApiProperty({ description: 'RFQ Request ID' })
  @IsString()
  rfqRequestId: string;

  @ApiProperty({ description: 'Selected Offer ID' })
  @IsString()
  offerId: string;

  @ApiPropertyOptional({ description: 'Delivery address ID' })
  @IsString()
  @IsOptional()
  addressId?: string;

  @ApiPropertyOptional({ description: 'Shipping address object' })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  @IsOptional()
  shippingAddress?: ShippingAddressDto;

  @ApiPropertyOptional({ description: 'Special instructions' })
  @IsString()
  @IsOptional()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Customer wants to pay at shop (only for same-city custom orders)' })
  @IsBoolean()
  @IsOptional()
  payAtShop?: boolean;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ description: 'New order status' })
  @IsString()
  status: string;

  @ApiPropertyOptional({ description: 'Status update notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateMilestoneDto {
  @ApiProperty({ description: 'Milestone title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Milestone description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Image URLs for this milestone' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ description: 'Completion percentage' })
  @IsNumber()
  @IsOptional()
  progressPercent?: number;
}

export class OrderFilterDto {
  @ApiPropertyOptional({ description: 'Filter by order type' })
  @IsEnum(OrderType)
  @IsOptional()
  type?: OrderType;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by shop ID' })
  @IsString()
  @IsOptional()
  shopId?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Items per page (alias for limit)' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Filter by payment status' })
  @IsString()
  @IsOptional()
  paymentStatus?: string;
}

// Admin-specific DTOs

export class AdminOrderFilterDto extends OrderFilterDto {
  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filter orders created by admin' })
  @IsOptional()
  createdByAdmin?: boolean;

  @ApiPropertyOptional({ description: 'Search by order number, customer name, or shop name' })
  @IsString()
  @IsOptional()
  search?: string;
}

export class AdminCancelOrderDto {
  @ApiProperty({ description: 'Reason for cancellation' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Internal admin notes' })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class AdminUpdateTimelineDto {
  @ApiProperty({ description: 'New estimated delivery date' })
  @IsString()
  estimatedDelivery: string;

  @ApiPropertyOptional({ description: 'Admin notes about the change' })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class AdminVerifyPaymentDto {
  @ApiProperty({ description: 'Payment verification notes (bank statement, transaction ID, etc.)' })
  @IsString()
  verificationNotes: string;

  @ApiPropertyOptional({ description: 'Amount verified' })
  @IsNumber()
  @IsOptional()
  amountVerified?: number;
}

export class CreateCounterOfferDto {
  @ApiProperty({ description: 'Order ID to create counter-offer for' })
  @IsString()
  orderId: string;

  @ApiPropertyOptional({ description: 'Updated materials specification' })
  @IsOptional()
  materials?: {
    metalType?: string;
    purity?: string;
    weight?: number;
  };

  @ApiPropertyOptional({ description: 'Updated gemstone specifications' })
  @IsOptional()
  gemstones?: Array<{
    type: string;
    count: number;
    carats?: number;
    quality?: string;
  }>;

  @ApiPropertyOptional({ description: 'Updated finish options' })
  @IsOptional()
  finishes?: {
    polish?: string;
    texture?: string;
    plating?: string;
  };

  @ApiPropertyOptional({ description: 'Updated timeline' })
  @IsOptional()
  timeline?: {
    estimatedDays: number;
    rushAvailable?: boolean;
    rushDays?: number;
  };

  @ApiPropertyOptional({ description: 'Updated pricing' })
  @IsOptional()
  pricing?: {
    subtotalNpr: number;
    makingChargesNpr: number;
    taxNpr: number;
    totalNpr: number;
  };

  @ApiProperty({ description: 'Summary of changes for customer' })
  @IsString()
  changeSummary: string;

  @ApiPropertyOptional({ description: 'Notes for the customer' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RespondToCounterOfferDto {
  @ApiProperty({ description: 'Customer response' })
  @IsEnum(['ACCEPT', 'REJECT', 'COUNTER'])
  response: 'ACCEPT' | 'REJECT' | 'COUNTER';

  @ApiPropertyOptional({ description: 'Customer notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

// ══════════════════════════════════════
// NEW: Order Status & Payment Status DTOs
// ══════════════════════════════════════

export enum DetailedOrderStatus {
  PLACED = 'PLACED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  READY = 'READY',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  PAID_ON_SHOP = 'PAID_ON_SHOP',
  PARTIAL = 'PARTIAL',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  UPI = 'UPI',
  ESEWA = 'ESEWA',
  KHALTI = 'KHALTI',
  CONNECTIPS = 'CONNECTIPS',
  PAYPAL = 'PAYPAL',
  STRIPE = 'STRIPE',
  PAID_AT_SHOP = 'PAID_AT_SHOP',
}

export class AdminUpdateOrderStatusDto {
  @ApiProperty({ description: 'New detailed order status', enum: DetailedOrderStatus })
  @IsEnum(DetailedOrderStatus)
  detailedStatus: DetailedOrderStatus;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class AdminUpdatePaymentStatusDto {
  @ApiProperty({ description: 'New payment status', enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({ description: 'Payment method used', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class ShopkeeperPaidAtShopDto {
  @ApiPropertyOptional({ description: 'Notes about the payment' })
  @IsString()
  @IsOptional()
  notes?: string;
}

