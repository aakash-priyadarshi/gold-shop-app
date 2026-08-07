import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class KarigarWorkshopDto {
  @IsString()
  @MaxLength(64)
  id: string;

  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(200)
  artisan: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rating?: number;

  @IsOptional()
  @IsNumber()
  metalIssued?: number;

  @IsOptional()
  @IsNumber()
  metalReturned?: number;

  @IsOptional()
  @IsNumber()
  wastagePercent?: number;

  @IsOptional()
  @IsNumber()
  wastageLimit?: number;

  @IsOptional()
  @IsNumber()
  wageRatePerGram?: number;

  @IsOptional()
  @IsNumber()
  outstandingBalance?: number;

  @IsOptional()
  @IsNumber()
  wageDue?: number;
}

export class KarigarJobDto {
  @IsString()
  @MaxLength(64)
  id: string;

  @IsString()
  @MaxLength(200)
  product: string;

  @IsString()
  @MaxLength(200)
  artisan: string;

  @IsOptional()
  @IsNumber()
  grossWeight?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsObject()
  steps?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  updatedAt?: string;
}

export class KarigarCustomMaterialDto {
  @IsString()
  @MaxLength(64)
  key: string;

  @IsString()
  @MaxLength(120)
  label: string;

  @IsString()
  @MaxLength(64)
  vaultKey: string;

  @IsOptional()
  @IsBoolean()
  isCustom?: boolean;
}

/**
 * Full karigar/supply-chain snapshot for a shop. The whole consistent state is
 * sent on every save; the server replaces it transactionally.
 *
 * Nested fields MUST be decorated — ValidationPipe whitelist strips undecorated
 * properties and createMany then fails with a database error.
 */
export class SaveKarigarStateDto {
  @IsObject()
  vaultReserves: Record<string, number>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KarigarWorkshopDto)
  workshops: KarigarWorkshopDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KarigarJobDto)
  jobs: KarigarJobDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KarigarCustomMaterialDto)
  customMaterials?: KarigarCustomMaterialDto[];
}
