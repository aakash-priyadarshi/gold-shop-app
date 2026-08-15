import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  Min,
  Max,
  IsEnum,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurrencyCode } from '@prisma/client';
import { SUPPORTED_MARKET_COUNTRIES } from '../../../common/market/country-currency';

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

  @ApiPropertyOptional({ enum: SUPPORTED_MARKET_COUNTRIES, default: 'NP' })
  @IsOptional()
  @IsIn(SUPPORTED_MARKET_COUNTRIES)
  country?: string;

  @ApiPropertyOptional({ enum: CurrencyCode, default: CurrencyCode.NPR })
  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @ApiPropertyOptional({
    description: 'Sri Lankan 9-digit TIN submitted for VAT verification',
  })
  @IsOptional()
  @IsString()
  vatNumber?: string;

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

  @ApiPropertyOptional({ example: 50000, description: 'Max COD value in NPR' })
  @IsOptional()
  @IsNumber()
  codMaxValueNpr?: number;

  @ApiPropertyOptional({ example: 10, minimum: 5, maximum: 25 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(25)
  makingChargePercent?: number;

  @ApiPropertyOptional({
    example: 'AUTO',
    description:
      'Customer billing wastage mode: AUTO | DISABLED | WEIGHT_PERCENT | METAL_VALUE_PERCENT',
  })
  @IsOptional()
  @IsString()
  @IsIn(['AUTO', 'DISABLED', 'WEIGHT_PERCENT', 'METAL_VALUE_PERCENT'])
  billingWastageMode?: string;

  @ApiPropertyOptional({
    example: 6,
    description: 'Override country default wastage %. Null uses market default.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  billingWastagePercent?: number | null;

  @ApiPropertyOptional({ example: 1000, description: 'Minimum order value in NPR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValueNpr?: number;

  @ApiPropertyOptional({ example: 500000, description: 'Maximum order value in NPR' })
  @IsOptional()
  @IsNumber()
  maxOrderValueNpr?: number;

  @ApiPropertyOptional({ default: true, description: 'Whether shop is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ 
    description: 'Bank account details for payments',
    example: { bankName: 'Nepal Bank', accountNumber: '1234567890', accountName: 'Shop Owner' }
  })
  @IsOptional()
  @IsObject()
  bankAccountDetails?: Record<string, any>;

  @ApiPropertyOptional({
    default: false,
    description:
      'When true (and plan includes workshopManufacturing) hide Supply Chain and show Workshop factory nav',
  })
  @IsOptional()
  @IsBoolean()
  workshopMode?: boolean;

  @ApiPropertyOptional({
    description:
      'Ordered KarigarStage keys for Floor queues. Null uses CASTING → QC.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workshopDepartments?: string[] | null;
}
