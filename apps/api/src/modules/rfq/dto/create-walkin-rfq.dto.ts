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

class WalkInCustomerDto {
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

export class CreateWalkInRfqDto {
  @ApiProperty({ type: WalkInCustomerDto, description: 'Walk-in customer details' })
  @ValidateNested()
  @Type(() => WalkInCustomerDto)
  customer: WalkInCustomerDto;

  @ApiProperty({
    enum: ['RING', 'NECKLACE', 'BRACELET', 'BANGLE', 'EARRING', 'PENDANT', 'CHAIN', 'ANKLET', 'NOSE_PIN', 'MANGALSUTRA', 'MAANG_TIKKA', 'OTHER'],
    example: 'RING',
  })
  @IsEnum(['RING', 'NECKLACE', 'BRACELET', 'BANGLE', 'EARRING', 'PENDANT', 'CHAIN', 'ANKLET', 'NOSE_PIN', 'MANGALSUTRA', 'MAANG_TIKKA', 'OTHER'])
  jewelleryType: string;

  @ApiProperty({
    enum: ['METHOD_A', 'METHOD_B', 'METHOD_C', 'METHOD_D'],
    example: 'METHOD_A',
    description: 'Manufacturing method - A: Solid Precious Metal, B: Standard Alloy, C: Core Metal + Finish, D: Multi-Metal Construction',
  })
  @IsEnum(['METHOD_A', 'METHOD_B', 'METHOD_C', 'METHOD_D'])
  buildMethod: string;

  @ApiProperty({
    description: 'Composition details based on build method',
    example: {
      preciousMetal: 'GOLD_22K',
      purity: 0.916,
    },
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

  @ApiPropertyOptional({ example: 50000, description: 'Minimum budget in NPR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMinNpr?: number;

  @ApiPropertyOptional({ example: 100000, description: 'Maximum budget in NPR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMaxNpr?: number;

  @ApiPropertyOptional({ example: 14, description: 'Preferred delivery in days' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  preferredDeliveryDays?: number;

  @ApiPropertyOptional({ example: 'Engraving: "Forever"' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiPropertyOptional({ example: ['https://example.com/ref1.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceImages?: string[];
}
