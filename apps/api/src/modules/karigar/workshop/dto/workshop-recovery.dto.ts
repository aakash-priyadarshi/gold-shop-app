import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreateWorkshopRecoveryContainerDto {
  @IsString() @IsNotEmpty() @MaxLength(80) code: string;
  @IsString() @IsNotEmpty() materialKey: string;
  @IsOptional() @IsString() sourceProcessRunId?: string;
  @IsOptional() @IsString() workstationId?: string;
}

export class CreateWorkshopRecoveryEventDto {
  @IsString() @IsNotEmpty() containerId: string;
}

export class WorkshopAssayDto {
  @IsString() @IsNotEmpty() materialId: string;
  @IsOptional() @IsString() recoveryEventId?: string;
  @IsString() @Matches(/^(0(\.\d{1,6})?|1(\.0{1,6})?)$/) fineGoldFraction: string;
  @IsString() @IsNotEmpty() @MaxLength(300) source: string;
  @IsOptional() @IsString() @MaxLength(1000) evidence?: string;
}

export class ClassifyWorkshopRecoveryDto {
  @IsString() @IsNotEmpty() @MaxLength(1000) reason: string;
}
