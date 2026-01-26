import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class CreateRfqDto {
  @ApiProperty({
    enum: [
      "RING",
      "NECKLACE",
      "BRACELET",
      "BANGLE",
      "EARRING",
      "PENDANT",
      "CHAIN",
      "ANKLET",
      "NOSE_PIN",
      "MANGALSUTRA",
      "MAANG_TIKKA",
      "OTHER",
    ],
    example: "RING",
  })
  @IsEnum([
    "RING",
    "NECKLACE",
    "BRACELET",
    "BANGLE",
    "EARRING",
    "PENDANT",
    "CHAIN",
    "ANKLET",
    "NOSE_PIN",
    "MANGALSUTRA",
    "MAANG_TIKKA",
    "OTHER",
  ])
  jewelleryType: string;

  @ApiProperty({
    enum: ["METHOD_A", "METHOD_B", "METHOD_C", "METHOD_D"],
    example: "METHOD_A",
    description:
      "Manufacturing method - A: Solid Precious Metal, B: Standard Alloy, C: Core Metal + Finish, D: Multi-Metal Construction",
  })
  @IsEnum(["METHOD_A", "METHOD_B", "METHOD_C", "METHOD_D"])
  buildMethod: string;

  @ApiProperty({
    description: "Composition details based on build method",
    example: {
      preciousMetal: "GOLD_22K",
      purity: 0.916,
    },
  })
  @IsObject()
  composition: Record<string, unknown>;

  @ApiPropertyOptional({
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "Optional design ID if created from Design Gallery",
  })
  @IsOptional()
  @IsUUID()
  designId?: string;

  @ApiPropertyOptional({
    example: 10.5,
    description: "Target total weight in grams",
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1000)
  targetTotalWeightG?: number;

  @ApiPropertyOptional({
    example: 8.0,
    description: "Target gold weight in grams (for Method D)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  targetGoldWeightG?: number;

  @ApiPropertyOptional({ example: 50000, description: "Minimum budget in NPR" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMinNpr?: number;

  @ApiPropertyOptional({
    example: 100000,
    description: "Maximum budget in NPR",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMaxNpr?: number;

  @ApiPropertyOptional({
    example: 14,
    description: "Preferred delivery in days",
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  preferredDeliveryDays?: number;

  @ApiPropertyOptional({ example: 'Engraving: "Forever"' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiPropertyOptional({ example: ["https://example.com/ref1.jpg"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImages?: string[];
}
