import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShopDto {
  @ApiProperty({ example: 'Golden Dreams Jewellers' })
  @IsString()
  shopName: string;

  @ApiPropertyOptional({ example: 'सुनहरा सपना ज्वेलर्स' })
  @IsOptional()
  @IsString()
  shopNameNe?: string;

  @ApiPropertyOptional({ example: 'सुनहरे सपने ज्वेलर्स' })
  @IsOptional()
  @IsString()
  shopNameHi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['NP', 'IN'], default: 'NP' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 'Kathmandu' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'New Road, Kathmandu' })
  @IsString()
  address: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiProperty({ example: '+9779812345678' })
  @IsString()
  contactPhone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @ApiPropertyOptional({
    example: ['RING', 'NECKLACE', 'BRACELET'],
    description: 'Supported jewellery types',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedJewelleryTypes?: string[];

  @ApiPropertyOptional({
    example: ['METHOD_A', 'METHOD_B', 'METHOD_C'],
    description: 'Supported manufacturing methods',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedMethods?: string[];

  @ApiPropertyOptional({ example: ['GOLD_24K', 'GOLD_22K', 'SILVER_925'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedMaterials?: string[];

  @ApiPropertyOptional({ example: ['GOLD_PLATING', 'RHODIUM_PLATING'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedFinishes?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  codEnabled?: boolean;

  @ApiPropertyOptional({ example: 10, minimum: 5, maximum: 25 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(25)
  makingChargePercent?: number;
}
