import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CurrencyCode } from '@prisma/client';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ 
    enum: ['en', 'ne', 'hi'],
    description: 'Preferred language for the UI'
  })
  @IsOptional()
  @IsEnum(['en', 'ne', 'hi'])
  preferredLanguage?: string;

  @ApiPropertyOptional({ 
    enum: CurrencyCode,
    description: 'Preferred currency for prices'
  })
  @IsOptional()
  @IsEnum(CurrencyCode)
  preferredCurrency?: CurrencyCode;

  @ApiPropertyOptional({ 
    enum: ['NP', 'IN', 'AE', 'UK', 'EU', 'US'],
    description: 'Preferred country for tax jurisdiction'
  })
  @IsOptional()
  @IsEnum(['NP', 'IN', 'AE', 'UK', 'EU', 'US'])
  preferredCountry?: string;

  @ApiPropertyOptional({ description: 'Preferred state/province code' })
  @IsOptional()
  @IsString()
  preferredState?: string;

  @ApiPropertyOptional({ description: 'Preferred city name' })
  @IsOptional()
  @IsString()
  preferredCity?: string;

  @ApiPropertyOptional({ 
    enum: ['light', 'dark', 'system'],
    description: 'Theme mode preference'
  })
  @IsOptional()
  @IsEnum(['light', 'dark', 'system'])
  themeMode?: string;
}
