import {
  IsString,
  IsOptional,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for completing shop setup for OAuth (Google) authenticated shopkeepers.
 * This is used when a user signs up via Google OAuth as a SHOPKEEPER
 * and needs to provide shop details and their phone number.
 */
export class OAuthShopSetupDto {
  @ApiProperty({ example: 'Golden Dreams Jewellers', description: 'Shop name' })
  @IsString()
  @MinLength(2)
  shopName: string;

  @ApiProperty({ 
    example: '+9779812345678', 
    description: 'Shopkeeper\'s personal phone number (required, must be unique)' 
  })
  @IsString()
  @MinLength(10)
  userPhone: string;

  @ApiPropertyOptional({ enum: ['NP', 'IN', 'US', 'AE', 'UK'], default: 'NP' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'NPR', description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'Kathmandu', description: 'City where shop is located' })
  @IsString()
  @MinLength(2)
  city: string;

  @ApiPropertyOptional({ example: 'New Road, Kathmandu', description: 'Shop address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ 
    example: '+977-1-4234567', 
    description: 'Shop contact phone (optional, can be same as user phone)' 
  })
  @IsOptional()
  @IsString()
  shopPhone?: string;

  @ApiPropertyOptional({ description: 'Shop contact email (defaults to user email)' })
  @IsOptional()
  @IsString()
  contactEmail?: string;
}
