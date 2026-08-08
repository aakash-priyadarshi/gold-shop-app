import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VatRegistrationStatus } from "@prisma/client";
import { IsEnum, IsOptional, Matches } from "class-validator";

export class UpdateVatRegistrationDto {
  @ApiProperty({ enum: VatRegistrationStatus })
  @IsEnum(VatRegistrationStatus)
  status: VatRegistrationStatus;

  @ApiPropertyOptional({ description: "Verified Sri Lankan 9-digit TIN" })
  @IsOptional()
  @Matches(/^\d{9}$/)
  vatNumber?: string;
}
