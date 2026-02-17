import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVariantDto {
  @ApiProperty({ example: 'US 7' })
  @IsString()
  @MaxLength(20)
  sizeLabel: string;

  @ApiPropertyOptional({ example: 'US' })
  @IsOptional()
  @IsString()
  sizeSystem?: string;

  @ApiPropertyOptional({ example: 7.0 })
  @IsOptional()
  @IsNumber()
  sizeValue?: number;

  @ApiProperty({ example: 'RING-24K-US7' })
  @IsString()
  @MaxLength(100)
  sku: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ description: 'Price override for this size (null = use parent price)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceOverride?: number;
}

export class BulkCreateVariantsDto {
  @ApiProperty({ type: [CreateVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}

export class UpdateVariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceOverride?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ToggleSizesDto {
  @ApiProperty()
  @IsBoolean()
  hasSizes: boolean;
}
