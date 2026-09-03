import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreatePlanInquiryDto {
  @ApiProperty({ example: "PRO_PLUS" })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  planName: string;

  @ApiPropertyOptional({ example: "We run 3 shops and need multi-branch." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

export class CreatePlanQuoteDto {
  @ApiProperty({ description: "Shop the quote is issued to" })
  @IsString()
  shopId: string;

  @ApiProperty({ description: "Paid plan the quote customises" })
  @IsString()
  planId: string;

  @ApiPropertyOptional({ description: "Link back to the originating inquiry" })
  @IsOptional()
  @IsString()
  inquiryId?: string;

  @ApiPropertyOptional({ description: "Custom monthly price in plan currency" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10_000_000)
  monthlyPrice?: number;

  @ApiPropertyOptional({ description: "Custom annual price in plan currency" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10_000_000)
  annualPrice?: number;

  @ApiProperty({ description: "Days the quote stays redeemable" })
  @IsInt()
  @Min(1)
  @Max(180)
  validityDays: number;

  @ApiPropertyOptional({ description: "Optional notes shown in the email" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdatePlanInquiryDto {
  @ApiProperty({ enum: ["NEW", "QUOTED", "CLOSED"] })
  @IsEnum(["NEW", "QUOTED", "CLOSED"])
  status: "NEW" | "QUOTED" | "CLOSED";
}

export class RevokePlanQuoteDto {
  @ApiProperty({ enum: ["REVOKED"] })
  @IsEnum(["REVOKED"])
  status: "REVOKED";
}
