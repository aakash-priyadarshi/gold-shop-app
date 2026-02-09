import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsObject,
  IsArray,
  IsNotEmpty,
  IsEmail,
  Matches,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WalkInCustomerDto {
  @ApiProperty({ example: 'Rahul Sharma', description: 'Customer full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+91', description: 'Phone country code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+\d{1,4}$/, { message: 'Invalid country code format. Use format like +91, +977' })
  phoneCountryCode: string;

  @ApiProperty({ example: '9876543210', description: 'Phone number without country code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{7,15}$/, { message: 'Phone number must be 7-15 digits' })
  phone: string;

  @ApiPropertyOptional({ example: 'customer@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '123 Main Street, Sector 5' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: 'India', default: 'India' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class CreateShopQuoteDto {
  @ApiProperty({ type: WalkInCustomerDto, description: 'Walk-in customer details' })
  @ValidateNested()
  @Type(() => WalkInCustomerDto)
  customer: WalkInCustomerDto;

  @ApiProperty({
    enum: ['RING', 'NECKLACE', 'BRACELET', 'BANGLE', 'EARRING', 'PENDANT', 'CHAIN', 'ANKLET', 'BROOCH', 'TIE_PIN', 'CUFFLINKS', 'NOSE_PIN', 'MANGALSUTRA', 'MAANG_TIKKA', 'OTHER'],
    example: 'RING',
  })
  @IsEnum(['RING', 'NECKLACE', 'BRACELET', 'BANGLE', 'EARRING', 'PENDANT', 'CHAIN', 'ANKLET', 'BROOCH', 'TIE_PIN', 'CUFFLINKS', 'NOSE_PIN', 'MANGALSUTRA', 'MAANG_TIKKA', 'OTHER'])
  jewelleryType: string;

  @ApiProperty({
    enum: ['METHOD_A', 'METHOD_B', 'METHOD_C', 'METHOD_D'],
    example: 'METHOD_A',
    description: 'Manufacturing method',
  })
  @IsEnum(['METHOD_A', 'METHOD_B', 'METHOD_C', 'METHOD_D'])
  buildMethod: string;

  @ApiProperty({
    description: 'Composition details based on build method',
    example: { preciousMetal: 'GOLD_22K', purity: 0.916 },
  })
  @IsObject()
  composition: Record<string, unknown>;

  @ApiPropertyOptional({ example: 10.5, description: 'Target total weight in grams' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1000)
  targetTotalWeightG?: number;

  @ApiPropertyOptional({ example: 8.0, description: 'Target gold weight in grams (for Method D)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  targetGoldWeightG?: number;

  @ApiPropertyOptional({ description: 'Special instructions for the order' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiPropertyOptional({ description: 'Reference image URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImages?: string[];

  // Pricing fields (optional at creation, can be added later)
  @ApiPropertyOptional({ example: 50000, description: 'Metal cost in NPR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  metalCostNpr?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Making charge in NPR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  makingChargeNpr?: number;

  @ApiPropertyOptional({ example: 3000, description: 'Gemstone cost in NPR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gemstoneCostNpr?: number;

  @ApiPropertyOptional({ example: 500, description: 'Finish cost in NPR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  finishCostNpr?: number;

  @ApiPropertyOptional({ example: 14, description: 'Estimated days to complete' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDays?: number;

  @ApiPropertyOptional({ description: 'Internal notes for shopkeeper' })
  @IsOptional()
  @IsString()
  shopNotes?: string;
}

export class UpdateShopQuoteDto {
  @ApiPropertyOptional({ example: 50000, description: 'Metal cost in NPR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  metalCostNpr?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Making charge in NPR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  makingChargeNpr?: number;

  @ApiPropertyOptional({ example: 3000, description: 'Gemstone cost in NPR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gemstoneCostNpr?: number;

  @ApiPropertyOptional({ example: 500, description: 'Finish cost in NPR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  finishCostNpr?: number;

  @ApiPropertyOptional({ example: 14, description: 'Estimated days to complete' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDays?: number;

  @ApiPropertyOptional({ description: 'Internal notes for shopkeeper' })
  @IsOptional()
  @IsString()
  shopNotes?: string;

  @ApiPropertyOptional({ description: 'Special instructions update' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

export class UpdateQuoteStatusDto {
  @ApiProperty({
    enum: ['CONFIRMED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED'],
    description: 'New status for the quote',
  })
  @IsEnum(['CONFIRMED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED'])
  status: string;

  @ApiPropertyOptional({ description: 'Reason for cancellation (required if cancelling)' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}

export class RecordPaymentDto {
  @ApiProperty({ example: 10000, description: 'Amount paid in NPR' })
  @IsNumber()
  @Min(1)
  amountNpr: number;

  @ApiPropertyOptional({ description: 'Payment notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class LookupCustomerDto {
  @ApiProperty({ example: '+91', description: 'Phone country code' })
  @IsString()
  @IsNotEmpty()
  phoneCountryCode: string;

  @ApiProperty({ example: '9876543210', description: 'Phone number without country code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{7,15}$/, { message: 'Phone number must be 7-15 digits' })
  phone: string;
}
