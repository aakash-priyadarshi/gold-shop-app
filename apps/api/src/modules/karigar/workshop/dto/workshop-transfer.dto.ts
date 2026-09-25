import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateWorkshopTransferDto {
  @IsString() @IsNotEmpty() treeId: string;
  @IsString() @IsNotEmpty() materialKey: string;
  @IsString() @IsNotEmpty() @MaxLength(100) fromDepartment: string;
  @IsString() @IsNotEmpty() @MaxLength(100) toDepartment: string;
}

export class ApproveWorkshopTransferDto {
  @IsString() @IsNotEmpty() @MaxLength(1000) reason: string;
}

export class ReconcileWorkshopTransferDto {
  @IsString() @IsNotEmpty() @MaxLength(1000) classificationReason: string;
  /** Required only when receipt is heavier than dispatch: identify real stock supplying the excess. */
  @IsOptional() @IsString() @IsNotEmpty() sourceAccountId?: string;
}
