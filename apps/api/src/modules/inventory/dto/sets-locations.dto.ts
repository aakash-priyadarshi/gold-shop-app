import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum StorageLocationKindDto {
  AREA = "AREA",
  CABINET = "CABINET",
  BIN = "BIN",
}

export class CreateStorageLocationDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ enum: StorageLocationKindDto })
  @IsEnum(StorageLocationKindDto)
  @IsOptional()
  kind?: StorageLocationKindDto;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateStorageLocationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  parentId?: string | null;

  @ApiPropertyOptional({ enum: StorageLocationKindDto })
  @IsEnum(StorageLocationKindDto)
  @IsOptional()
  kind?: StorageLocationKindDto;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class TransferLocationDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID("4", { each: true })
  itemIds: string[];

  @ApiPropertyOptional({ description: "Null clears location" })
  @IsUUID()
  @IsOptional()
  locationId?: string | null;
}

export class SetComponentInputDto {
  @ApiPropertyOptional({ description: "Existing inventory item to attach" })
  @IsUUID()
  @IsOptional()
  componentItemId?: string;

  @ApiPropertyOptional({ description: "Role in set e.g. EARRING, NECKLACE" })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  /** Inline create fields (when componentItemId omitted) */
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  jewelleryType?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalWeightGrams?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  metalValueNpr?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  makingChargeNpr?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  gemstoneValueNpr?: number;

  @ApiPropertyOptional({
    description: "Gemstone line items (type, cut, caratWeight, valueNpr, etc.)",
  })
  @IsArray()
  @IsOptional()
  gemstones?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  composition?: Record<string, unknown>;
}

export class CreateSetDto {
  @ApiProperty()
  @IsString()
  nameEn: string;

  @ApiProperty()
  @IsString()
  sku: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiPropertyOptional({ description: "PERCENT or FIXED" })
  @IsString()
  @IsOptional()
  setDiscountType?: "PERCENT" | "FIXED";

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  setDiscountValue?: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  locationId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiProperty({ type: [SetComponentInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetComponentInputDto)
  components: SetComponentInputDto[];
}

export class UpdateSetDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nameEn?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  setDiscountType?: "PERCENT" | "FIXED" | null;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  setDiscountValue?: number | null;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  locationId?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({ type: [SetComponentInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetComponentInputDto)
  @IsOptional()
  components?: SetComponentInputDto[];
}
