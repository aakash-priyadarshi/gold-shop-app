import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { JewelleryType } from "@prisma/client";
import { ConfirmWeighingSessionDto } from "./workshop-weighing.dto";

export const WORKSHOP_MOVEMENT_KINDS = [
  "MATERIAL_ISSUE", "ADDITIONAL_ISSUE", "PROCESS_INPUT", "PROCESS_OUTPUT", "MIXED_OUTPUT",
  "TRANSFER_DISPATCH", "TRANSFER_RECEIPT", "RECOVERY_DEPOSIT",
  "RECOVERY_SEND", "RECOVERY_RESULT", "STONE_SETTING", "STONE_RETURN",
  "FINISHED_RECEIPT",
] as const;
export type WorkshopMovementKind = typeof WORKSHOP_MOVEMENT_KINDS[number];

export class CreateWorkshopMovementSessionDto {
  @IsIn(WORKSHOP_MOVEMENT_KINDS) movementKind: WorkshopMovementKind;
  @IsString() @IsNotEmpty() @MaxLength(80) materialKey: string;
  @IsString() @IsNotEmpty() deviceId: string;
  @IsOptional() @IsString() jobId?: string;
  @IsOptional() @IsString() treeId?: string;
  @IsOptional() @IsString() processRunId?: string;
  @IsOptional() @IsString() transferId?: string;
  @IsOptional() @IsString() recoveryContainerId?: string;
  @IsOptional() @IsString() recoveryEventId?: string;
  @IsOptional() @IsString() batchChildId?: string;
  @IsOptional() @IsIn(["VAULT", "WIP", "REUSABLE", "SCRAP", "RECOVERY_PENDING", "REFINERY", "FINISHED"])
  disposition?: "VAULT" | "WIP" | "REUSABLE" | "SCRAP" | "RECOVERY_PENDING" | "REFINERY" | "FINISHED";
}

export class WorkshopFinishedGoodsDto {
  @IsString() @IsNotEmpty() @MaxLength(200) nameEn: string;
  @IsEnum(JewelleryType) jewelleryType: JewelleryType;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) sku?: string;
}

export class ConfirmWorkshopMovementDto extends ConfirmWeighingSessionDto {
  @IsOptional() @ValidateNested() @Type(() => WorkshopFinishedGoodsDto)
  finishedGoods?: WorkshopFinishedGoodsDto;
  @IsOptional() @IsString() @MaxLength(1000) exceptionReason?: string;
}
