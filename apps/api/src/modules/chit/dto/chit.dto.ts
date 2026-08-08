import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { CurrencyCode } from "@prisma/client";

export class CreateChitGroupDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsNumber()
  @Min(1)
  chitValue: number;

  @IsInt()
  @Min(2)
  @Max(120)
  memberSlots: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  installmentAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  foremanCommissionPercent?: number;

  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @IsOptional()
  @IsISO8601()
  startDate?: string;
}

export class AddChitMemberDto {
  @IsString()
  @MaxLength(200)
  customerName: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  customerPhone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  ticketNumber?: number;
}

export class OpenChitCycleDto {
  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}

export class RecordChitPaymentDto {
  @IsString()
  memberId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;
}

export class DeclareChitWinnerDto {
  @IsString()
  winnerMemberId: string;
}
