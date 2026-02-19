import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

class CatalogueWalkInItemDto {
  @ApiProperty()
  @IsString()
  inventoryItemId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  qty?: number;
}

class CatalogueWalkInCustomerDto {
  @ApiPropertyOptional({ example: "John Doe" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "+977-9812345678" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "Repeat customer, prefers gold" })
  @IsOptional()
  @IsString()
  notes?: string;
}

class CatalogueMeasurementsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ringSize?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wristSize?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chainLength?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bangleSize?: string;
}

export class CreateCatalogueWalkInRfqDto {
  @ApiPropertyOptional({ example: "wedding-collection-abc12" })
  @IsOptional()
  @IsString()
  catalogueSlug?: string;

  @ApiProperty({ type: [CatalogueWalkInItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogueWalkInItemDto)
  items: CatalogueWalkInItemDto[];

  @ApiPropertyOptional({
    enum: [
      "RING", "NECKLACE", "BRACELET", "BANGLE", "EARRING",
      "PENDANT", "CHAIN", "ANKLET", "BROOCH", "OTHER",
    ],
  })
  @IsOptional()
  @IsString()
  jewelleryType?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  deadlineDays?: number;

  @ApiPropertyOptional({ example: "Customer wants engraving" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: CatalogueMeasurementsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CatalogueMeasurementsDto)
  measurements?: CatalogueMeasurementsDto;

  @ApiPropertyOptional({ type: CatalogueWalkInCustomerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CatalogueWalkInCustomerDto)
  walkInCustomer?: CatalogueWalkInCustomerDto;

  @ApiPropertyOptional({
    example: [{ key: "rfq/abc123.jpg" }],
    description: "Reference image uploads via existing worker type rfq",
  })
  @IsOptional()
  @IsArray()
  attachments?: { key?: string; url?: string }[];
}
