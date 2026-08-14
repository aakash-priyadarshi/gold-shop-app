import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export const KARIGAR_STAGE_VALUES = [
  "CASTING",
  "FILING",
  "POLISHING",
  "SETTING",
  "FINAL_POLISH",
  "QC",
] as const;

export const KARIGAR_MOVEMENT_TYPES = [
  "ISSUE",
  "TRANSFER",
  "RETURN_FINISHED",
  "RETURN_SPRUE",
  "SCRAP",
  "DUST",
  "ADJUST",
] as const;

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
  @IsString()
  @MaxLength(64)
  workshopId?: string;

  @IsOptional()
  @IsNumber()
  grossWeight?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  metalKey?: string;

  @IsOptional()
  @IsNumber()
  allowedWastagePercent?: number;

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
 * Workshops + vault only. Jobs live on dedicated CRUD so a snapshot save
 * cannot wipe the gold ledger.
 */
export class SaveKarigarStateDto {
  @IsObject()
  vaultReserves: Record<string, number>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KarigarWorkshopDto)
  workshops: KarigarWorkshopDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KarigarJobDto)
  jobs?: KarigarJobDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KarigarCustomMaterialDto)
  customMaterials?: KarigarCustomMaterialDto[];
}

export class CreateKarigarJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  id?: string;

  @IsString()
  @MaxLength(200)
  product: string;

  @IsString()
  @MaxLength(200)
  artisan: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  workshopId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  grossWeight?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  metalKey?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  allowedWastagePercent?: number;
}

export class UpdateKarigarJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  product?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  artisan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  workshopId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  grossWeight?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  metalKey?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  allowedWastagePercent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;
}

export class CreateKarigarMovementDto {
  @IsIn(KARIGAR_MOVEMENT_TYPES)
  type: (typeof KARIGAR_MOVEMENT_TYPES)[number];

  @IsNumber()
  @Min(0.001)
  weightGrams: number;

  @ValidateIf((dto) => dto.type === "ISSUE")
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  workshopId?: string;

  @IsOptional()
  @IsIn(KARIGAR_STAGE_VALUES)
  stage?: (typeof KARIGAR_STAGE_VALUES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  treeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  metalKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  purity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;
}

export class UpdateKarigarStageDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  goldInGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  goldOutGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  scrapGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dustGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  allowedWastagePercent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  workshopId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;
}

export class CastingTreeLineDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  id?: string;

  @IsString()
  @MaxLength(120)
  label: string;

  @IsNumber()
  @Min(0)
  weightGrams: number;
}

export class CreateCastingTreeDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsNumber()
  @Min(0.001)
  issuedGrams: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  metalKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  purity?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  allowedWastagePercent?: number;
}

export class UpdateCastingTreeDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  issuedGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  finishedGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sprueButtonGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  recoverableGrams?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  allowedWastagePercent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  purity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CastingTreeLineDto)
  lines?: CastingTreeLineDto[];
}
