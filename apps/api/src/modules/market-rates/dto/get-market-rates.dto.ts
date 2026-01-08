import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetMarketRatesDto {
  @ApiProperty({
    description: 'Currency code for pricing (required for new API, determines default region)',
    enum: ['NPR', 'INR', 'AED', 'USD', 'GBP', 'EUR'],
    default: 'NPR',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['NPR', 'INR', 'AED', 'USD', 'GBP', 'EUR'])
  currency?: 'NPR' | 'INR' | 'AED' | 'USD' | 'GBP' | 'EUR' = 'NPR';

  @ApiProperty({
    description: 'Market region for tax/duty adjustments (optional, defaults based on currency)',
    enum: ['NP', 'IN', 'AE', 'UK', 'EU', 'US'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['NP', 'IN', 'AE', 'UK', 'EU', 'US'])
  region?: 'NP' | 'IN' | 'AE' | 'UK' | 'EU' | 'US';

  // Legacy/region parameter for market rates
  // Can be either legacy country (IN, NP) or modern region (AE, UK, EU, US)
  // Used for determining tax jurisdiction
  @ApiProperty({
    description: 'Country/region code for local market rates and tax jurisdiction',
    enum: ['IN', 'NP', 'AE', 'UK', 'EU', 'US'],
    required: false,
    deprecated: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['IN', 'NP', 'AE', 'UK', 'EU', 'US'])
  country?: 'IN' | 'NP' | 'AE' | 'UK' | 'EU' | 'US';
}
