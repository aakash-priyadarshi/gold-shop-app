import { ApiPropertyOptional } from "@nestjs/swagger";
import { CurrencyCode } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

const SUPPORTED_UI_LANGUAGES = [
  "en",
  "fr",
  "de",
  "hi",
  "es",
  "ar",
  "ne",
  "gu",
  "mr",
  "ta",
  "te",
  "kn",
] as const;

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "John" })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: "Doe" })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: "John Doe" })
  @IsOptional()
  @IsString()
  name?: string; // Combined name field (will be split into firstName/lastName)

  @ApiPropertyOptional({ example: "1990-01-01T00:00:00.000Z" })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: "MALE" })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: "+9779812345678" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "NP" })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: "Bagmati" })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: "Kathmandu" })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: SUPPORTED_UI_LANGUAGES })
  @IsOptional()
  @IsEnum(SUPPORTED_UI_LANGUAGES)
  preferredLanguage?: string;

  @ApiPropertyOptional({ enum: CurrencyCode })
  @IsOptional()
  @IsEnum(CurrencyCode)
  preferredCurrency?: CurrencyCode;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;
}
