import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateCatalogueDto {
  @ApiProperty({ example: "Wedding Collection 2025" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: "Our finest bridal jewellery pieces" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: ["NORMAL", "SHOWROOM"], default: "NORMAL" })
  @IsEnum(["NORMAL", "SHOWROOM"])
  mode: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description:
      "Password to protect the catalogue. Leave empty for no protection.",
  })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  password?: string;

  @ApiPropertyOptional({ example: "2025-12-31T23:59:59Z" })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
