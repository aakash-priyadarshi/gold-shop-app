import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsIn,
  ArrayMaxSize,
  ArrayMinSize,
  Max,
  MaxLength,
  Min,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { HALLMARK_ID_MAX_LENGTH, normalizeHallmarkId } from '@gold-shop/shared';
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

  @ApiProperty({ description: 'Metal-only weight in grams; gross weight is derived by the server' })
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

  @ApiPropertyOptional({
    description: 'Default customer billing wastage % (jarti) for this piece',
    example: 5,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  wastagePercent?: number;

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

  @ApiPropertyOptional({ description: 'HUID or hallmark / certificate number' })
  @IsString()
  @IsOptional()
  @MaxLength(HALLMARK_ID_MAX_LENGTH)
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeHallmarkId(value) : value,
  )
  hallmarkNumber?: string;

  @ApiPropertyOptional({ description: 'Physical RFID / EPC code', maxLength: 128 })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  rfidCode?: string;

  @ApiPropertyOptional({
    description: 'UK assay office',
    enum: ['LONDON', 'BIRMINGHAM', 'SHEFFIELD', 'EDINBURGH'],
  })
  @IsString()
  @IsOptional()
  assayOffice?: 'LONDON' | 'BIRMINGHAM' | 'SHEFFIELD' | 'EDINBURGH' | null;

  @ApiPropertyOptional({ description: 'Purity certificate URL' })
  @IsString()
  @IsOptional()
  purityCertUrl?: string;

  @ApiPropertyOptional({ description: 'Labels for the item' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];

  @ApiPropertyOptional({ description: 'Storage location ID' })
  @IsString()
  @IsOptional()
  locationId?: string;
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

  @ApiPropertyOptional({ description: 'SKU code' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ description: 'Jewellery type' })
  @IsString()
  @IsOptional()
  jewelleryType?: string;

  @ApiPropertyOptional({ description: 'Build method used (METHOD_A, METHOD_B, METHOD_C, METHOD_D)' })
  @IsString()
  @IsOptional()
  buildMethod?: string;

  @ApiPropertyOptional({ description: 'Composition details (JSON)' })
  @IsObject()
  @IsOptional()
  composition?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Metal-only weight in grams; gross weight is derived by the server' })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  totalWeightGrams?: number;

  @ApiPropertyOptional({ description: 'Dimensions (JSON)' })
  @IsObject()
  @IsOptional()
  dimensions?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Gemstones details (JSON)' })
  @IsObject()
  @IsOptional()
  gemstones?: Record<string, unknown>;

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

  @ApiPropertyOptional({
    description: 'Default customer billing wastage % (jarti) for this piece',
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  wastagePercent?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  gemstoneValueNpr?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  taxNpr?: number;

  @ApiPropertyOptional({ description: 'Certificate URL' })
  @IsString()
  @IsOptional()
  certificateUrl?: string;

  @ApiPropertyOptional({ description: 'HUID or hallmark / certificate number' })
  @IsString()
  @IsOptional()
  @MaxLength(HALLMARK_ID_MAX_LENGTH)
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeHallmarkId(value) : value,
  )
  hallmarkNumber?: string;

  @ApiPropertyOptional({ description: 'Physical RFID / EPC code', maxLength: 128 })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  rfidCode?: string | null;

  @ApiPropertyOptional({
    description: 'UK assay office',
    enum: ['LONDON', 'BIRMINGHAM', 'SHEFFIELD', 'EDINBURGH'],
  })
  @IsString()
  @IsOptional()
  assayOffice?: 'LONDON' | 'BIRMINGHAM' | 'SHEFFIELD' | 'EDINBURGH' | null;

  @ApiPropertyOptional({ description: 'Purity certificate URL' })
  @IsString()
  @IsOptional()
  purityCertUrl?: string;

  @ApiPropertyOptional({ description: 'Storage location ID' })
  @IsString()
  @IsOptional()
  locationId?: string | null;

  @ApiPropertyOptional({
    description: 'Discount type for jewellery sets (PERCENT | FIXED)',
    enum: ['PERCENT', 'FIXED'],
  })
  @IsString()
  @IsIn(['PERCENT', 'FIXED'])
  @IsOptional()
  setDiscountType?: 'PERCENT' | 'FIXED' | null;

  @ApiPropertyOptional({
    description: 'Discount value for jewellery sets (% or fixed amount)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  setDiscountValue?: number | null;
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

  @ApiPropertyOptional({
    description: 'When true, only return items with stockQuantity > 0',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  inStock?: boolean;

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

  @ApiPropertyOptional({ description: 'Filter by storage location (includes subtree when includeSubtree=true)' })
  @IsString()
  @IsOptional()
  locationId?: string;

  @ApiPropertyOptional({ description: 'When filtering by locationId, include child locations' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  includeSubtree?: boolean;

  @ApiPropertyOptional({ description: 'Exclude pieces that are bound as set components' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  excludeSetComponents?: boolean;
}

/** Multi-label jobs are feature-gated by the controller before printing. */
export class MultiTagPrintDto {
  @ApiProperty({ type: [String], maxItems: 200 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  itemIds: string[];

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  copies?: number;
}

export class GenerateProductDescriptionGemstoneDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  cut?: string;

  @IsOptional()
  @IsNumber()
  caratWeight?: number;
}

export class GenerateProductDescriptionDto {
  @IsString()
  jewelleryType: string;

  @IsString()
  metalType: string;

  @IsOptional()
  @IsString()
  purity?: string;

  @IsNumber()
  @Min(0.01)
  weightGrams: number;

  @IsOptional()
  @IsIn(["GRAM", "TOLA"])
  weightUnit?: "GRAM" | "TOLA";

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GenerateProductDescriptionGemstoneDto)
  gemstones?: GenerateProductDescriptionGemstoneDto[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}
