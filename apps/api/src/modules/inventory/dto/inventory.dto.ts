import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInventoryItemDto {
  @ApiProperty({ description: 'Item name (English)' })
  @IsString()
  nameEn: string;

  @ApiPropertyOptional({ description: 'Item name (Nepali)' })
  @IsString()
  @IsOptional()
  nameNe?: string;

  @ApiPropertyOptional({ description: 'Item name (Hindi)' })
  @IsString()
  @IsOptional()
  nameHi?: string;

  @ApiPropertyOptional({ description: 'Item description (English)' })
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: 'Item description (Nepali)' })
  @IsString()
  @IsOptional()
  descriptionNe?: string;

  @ApiPropertyOptional({ description: 'Item description (Hindi)' })
  @IsString()
  @IsOptional()
  descriptionHi?: string;

  @ApiProperty({ description: 'SKU code' })
  @IsString()
  sku: string;

  @ApiProperty({ description: 'Jewellery type' })
  @IsString()
  jewelleryType: string;

  @ApiProperty({ description: 'Build method used (METHOD_A, METHOD_B, METHOD_C, METHOD_D)' })
  @IsString()
  buildMethod: string;

  @ApiProperty({ description: 'Composition details (JSON)' })
  @IsObject()
  composition: Record<string, unknown>;

  @ApiProperty({ description: 'Total weight in grams' })
  @IsNumber()
  @Min(0.01)
  totalWeightGrams: number;

  @ApiPropertyOptional({ description: 'Dimensions (JSON)' })
  @IsObject()
  @IsOptional()
  dimensions?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Gemstones details (JSON)' })
  @IsObject()
  @IsOptional()
  gemstones?: Record<string, unknown>;

  @ApiProperty({ description: 'Metal value in NPR' })
  @IsNumber()
  @Min(0)
  metalValueNpr: number;

  @ApiProperty({ description: 'Making charge in NPR' })
  @IsNumber()
  @Min(0)
  makingChargeNpr: number;

  @ApiPropertyOptional({ description: 'Gemstone value in NPR' })
  @IsNumber()
  @IsOptional()
  gemstoneValueNpr?: number;

  @ApiPropertyOptional({ description: 'Tax in NPR' })
  @IsNumber()
  @IsOptional()
  taxNpr?: number;

  @ApiPropertyOptional({ description: 'Stock quantity' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  stockQuantity?: number;

  @ApiPropertyOptional({ description: 'Image URLs' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ description: 'Video URLs' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  videos?: string[];

  @ApiPropertyOptional({ description: 'Certificate URL' })
  @IsString()
  @IsOptional()
  certificateUrl?: string;

  @ApiPropertyOptional({ description: 'Hallmark number' })
  @IsString()
  @IsOptional()
  hallmarkNumber?: string;

  @ApiPropertyOptional({ description: 'Purity certificate URL' })
  @IsString()
  @IsOptional()
  purityCertUrl?: string;

  @ApiPropertyOptional({ description: 'Labels for the item' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];
}

export class UpdateInventoryItemDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nameNe?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nameHi?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  descriptionNe?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  descriptionHi?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  stockQuantity?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  videos?: string[];

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  metalValueNpr?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  makingChargeNpr?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  gemstoneValueNpr?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  taxNpr?: number;
}

export class InventoryFilterDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Jewellery type filter' })
  @IsString()
  @IsOptional()
  jewelleryType?: string;

  @ApiPropertyOptional({ description: 'Build method filter' })
  @IsString()
  @IsOptional()
  buildMethod?: string;

  @ApiPropertyOptional({ description: 'Shop ID filter' })
  @IsString()
  @IsOptional()
  shopId?: string;

  @ApiPropertyOptional({ description: 'Minimum price' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Minimum weight' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minWeight?: number;

  @ApiPropertyOptional({ description: 'Maximum weight' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxWeight?: number;

  @ApiPropertyOptional({ description: 'Status filter' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Page number' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
