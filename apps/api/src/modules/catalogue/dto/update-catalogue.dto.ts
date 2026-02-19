import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateCatalogueDto {
  @ApiPropertyOptional({ example: "Updated Collection Name" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: "Updated description" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: ["NORMAL", "SHOWROOM"] })
  @IsOptional()
  @IsEnum(["NORMAL", "SHOWROOM"])
  mode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: "Set new password. Send empty string to remove password.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  password?: string;

  @ApiPropertyOptional({ example: "2025-12-31T23:59:59Z" })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
