import { IsString, IsOptional, IsNumber, IsEnum, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrderType {
  INVENTORY = 'INVENTORY',
  CUSTOM = 'CUSTOM',
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

  @ApiPropertyOptional({ description: 'Special instructions' })
  @IsString()
  @IsOptional()
  instructions?: string;
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
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsNumber()
  @IsOptional()
  limit?: number;
}
