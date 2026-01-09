import { IsString, IsOptional, IsArray, IsEnum, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TokenDuration {
  DAYS_30 = '30d',
  DAYS_90 = '90d',
  DAYS_180 = '180d',
  DAYS_365 = '365d',
}

export class CreateApiTokenDto {
  @ApiProperty({ 
    description: 'Human-readable name for the token',
    example: 'GitHub Actions CI/CD'
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Permission scopes for the token',
    example: ['market-rates:refresh', 'health:read'],
    default: ['health:read']
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];

  @ApiProperty({
    description: 'Token validity duration',
    enum: TokenDuration,
    example: TokenDuration.DAYS_90
  })
  @IsEnum(TokenDuration)
  duration: TokenDuration;
}

export class RevokeApiTokenDto {
  @ApiProperty({ description: 'Token ID to revoke' })
  @IsString()
  tokenId: string;
}

export class ApiTokenResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  tokenPrefix: string;

  @ApiProperty()
  scopes: string[];

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({ nullable: true })
  lastUsedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  isExpired: boolean;

  @ApiProperty()
  daysUntilExpiry: number;

  @ApiProperty({ nullable: true, description: 'Token is viewable until this time (24h after creation)' })
  tokenViewableUntil: Date | null;
}

export class CreateApiTokenResponseDto extends ApiTokenResponseDto {
  @ApiProperty({ 
    description: 'Full token - ONLY shown once at creation time',
    example: 'gshop_abc123def456...'
  })
  token: string;
}
