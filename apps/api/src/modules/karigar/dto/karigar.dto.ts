import { IsArray, IsObject, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class KarigarWorkshopDto {
  id: string;
  name: string;
  artisan: string;
  location?: string;
  phone?: string;
  email?: string;
  rating?: number;
  metalIssued?: number;
  metalReturned?: number;
  wastagePercent?: number;
  wastageLimit?: number;
  wageRatePerGram?: number;
  outstandingBalance?: number;
  wageDue?: number;
}

export class KarigarJobDto {
  id: string;
  product: string;
  artisan: string;
  grossWeight?: number;
  status?: string;
  steps?: Record<string, unknown>;
  updatedAt?: string;
}

export class KarigarCustomMaterialDto {
  key: string;
  label: string;
  vaultKey: string;
}

/**
 * Full karigar/supply-chain snapshot for a shop. The whole consistent state is
 * sent on every save; the server replaces it transactionally. This lives in its
 * own tables (not the shared Shop.bankAccountDetails JSON blob) so saves no
 * longer clobber unrelated settings.
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
