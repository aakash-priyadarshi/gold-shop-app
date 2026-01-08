import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsObject,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOfferDto {
  @ApiProperty()
  @IsUUID()
  rfqId: string;

  @ApiProperty({
    enum: ['ACCEPT', 'COUNTER', 'DECLINE'],
    description: 'Type of response',
  })
  @IsEnum(['ACCEPT', 'COUNTER', 'DECLINE'])
  offerType: 'ACCEPT' | 'COUNTER' | 'DECLINE';

  @ApiPropertyOptional({ description: 'Required if declining' })
  @IsOptional()
  @IsString()
  declineReason?: string;

  @ApiPropertyOptional({
    description: 'Confirmed composition (may differ from request)',
  })
  @IsOptional()
  @IsObject()
  confirmedComposition?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  confirmedTotalWeightG?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  confirmedGoldWeightG?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  metalCostNpr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  makingChargeNpr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  finishCostNpr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  gemstoneCostNpr?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxNpr?: number;

  @ApiPropertyOptional({ example: 14 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDays?: number;

  @ApiPropertyOptional({ example: 20, minimum: 10, maximum: 50 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  bookingFeePercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shopNotes?: string;
}
