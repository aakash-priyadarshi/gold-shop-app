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
    enum: ['light', 'dark', 'system'],
    description: 'Theme mode preference'
  })
  @IsOptional()
  @IsEnum(['light', 'dark', 'system'])
  themeMode?: string;
}
